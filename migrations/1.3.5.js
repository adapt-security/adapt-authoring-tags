import { ObjectId } from 'mongodb'

const SKIP_COLLECTIONS = new Set(['migrations'])

export default function (migration) {
  migration.describe('Normalise tag references to ObjectId form across all collections')
  migration.runCommand(normaliseTags)
}

async function normaliseTags (db, log) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray()
  for (const { name } of collections) {
    if (SKIP_COLLECTIONS.has(name) || name.startsWith('system.')) continue
    await normaliseCollection(db.collection(name), log)
  }
}

async function normaliseCollection (collection, log) {
  const match = { tags: { $elemMatch: { $type: 'string' } } }
  const docs = await collection.find(match, { projection: { _id: 1, tags: 1 } }).toArray()
  if (!docs.length) return

  const ops = []
  let unconvertible = 0
  for (const doc of docs) {
    const next = []
    for (const t of doc.tags) {
      if (t instanceof ObjectId) {
        next.push(t)
      } else if (typeof t === 'string' && ObjectId.isValid(t)) {
        next.push(new ObjectId(t))
      } else {
        next.push(t)
        unconvertible++
      }
    }
    ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { tags: next } } } })
  }

  for (let i = 0; i < ops.length; i += 500) {
    await collection.bulkWrite(ops.slice(i, i + 500), { ordered: false })
  }
  log('info', 'migrations', `${collection.collectionName}: normalised tag entries on ${docs.length} document(s)`)
  if (unconvertible) log('warn', 'migrations', `${collection.collectionName}: ${unconvertible} tag entr(ies) could not be coerced to ObjectId and were left as-is`)
}
