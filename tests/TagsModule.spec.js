import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import TagsModule from '../lib/TagsModule.js'

/**
 * Creates a TagsModule instance with mocked dependencies.
 * Prevents the AbstractModule constructor from calling init()
 * by temporarily replacing the prototype method.
 */
function createInstance (overrides = {}) {
  const mockJsonschema = {
    registerSchemasHook: { tap: mock.fn() },
    extendSchema: mock.fn()
  }
  const mockMongodb = {
    setIndex: mock.fn(async () => {}),
    find: mock.fn(async () => []),
    insert: mock.fn(async () => ({})),
    delete: mock.fn(async () => {})
  }
  const mockApp = {
    waitForModule: mock.fn(async (name) => {
      if (name === 'jsonschema') return mockJsonschema
      if (name === 'mongodb') return mockMongodb
      return {}
    }),
    errors: {},
    dependencyloader: {
      moduleLoadedHook: {
        tap: () => {},
        untap: () => {}
      }
    },
    ...overrides
  }

  const originalInit = TagsModule.prototype.init
  TagsModule.prototype.init = async function () {}

  const instance = new TagsModule(mockApp, { name: 'adapt-authoring-tags' })

  TagsModule.prototype.init = originalInit

  // Manually set properties that setValues() would set
  instance.root = 'tags'
  instance.schemaName = 'tag'
  instance.schemaExtensionName = 'tags'
  instance.collectionName = 'tags'
  instance.modules = []
  instance.routes = []
  instance.log = mock.fn()

  return { instance, mockApp, mockJsonschema, mockMongodb }
}

describe('TagsModule', () => {
  describe('#setValues()', () => {
    it('should set schemaName to "tag"', async () => {
      const { instance } = createInstance()
      instance.schemaName = undefined
      Object.getPrototypeOf(TagsModule.prototype).setValues = mock.fn(async function () {})
      await instance.setValues()
      assert.equal(instance.schemaName, 'tag')
    })

    it('should set schemaExtensionName to "tags"', async () => {
      const { instance } = createInstance()
      instance.schemaExtensionName = undefined
      Object.getPrototypeOf(TagsModule.prototype).setValues = mock.fn(async function () {})
      await instance.setValues()
      assert.equal(instance.schemaExtensionName, 'tags')
    })

    it('should set collectionName to "tags"', async () => {
      const { instance } = createInstance()
      instance.collectionName = undefined
      Object.getPrototypeOf(TagsModule.prototype).setValues = mock.fn(async function () {})
      await instance.setValues()
      assert.equal(instance.collectionName, 'tags')
    })

    it('should initialise modules as an empty array', async () => {
      const { instance } = createInstance()
      instance.modules = undefined
      Object.getPrototypeOf(TagsModule.prototype).setValues = mock.fn(async function () {})
      await instance.setValues()
      assert.deepEqual(instance.modules, [])
    })

    it('should call mongodb.setIndex for unique title', async () => {
      const { instance, mockMongodb } = createInstance()
      Object.getPrototypeOf(TagsModule.prototype).setValues = mock.fn(async function () {})
      await instance.setValues()
      assert.equal(mockMongodb.setIndex.mock.calls.length, 1)
      const call = mockMongodb.setIndex.mock.calls[0]
      assert.equal(call.arguments[0], 'tags')
      assert.equal(call.arguments[1], 'title')
      assert.deepEqual(call.arguments[2], { unique: true })
    })
  })

  describe('#registerModule()', () => {
    it('should register a module with a schemaName', async () => {
      const { instance } = createInstance()
      const mod = { schemaName: 'testSchema', name: 'test-mod' }
      await instance.registerModule(mod)
      assert.equal(instance.modules.length, 1)
      assert.equal(instance.modules[0], mod)
    })

    it('should call registerSchema when registering a module', async () => {
      const { instance, mockJsonschema } = createInstance()
      const mod = { schemaName: 'testSchema', name: 'test-mod' }
      await instance.registerModule(mod)
      assert.ok(mockJsonschema.extendSchema.mock.calls.length > 0)
      const call = mockJsonschema.extendSchema.mock.calls[0]
      assert.equal(call.arguments[0], 'testSchema')
      assert.equal(call.arguments[1], 'tags')
    })

    it('should log a debug message after registering', async () => {
      const { instance } = createInstance()
      const mod = { schemaName: 'testSchema', name: 'test-mod' }
      await instance.registerModule(mod)
      const debugCalls = instance.log.mock.calls.filter(
        c => c.arguments[0] === 'debug'
      )
      assert.ok(debugCalls.length > 0)
      assert.ok(debugCalls[0].arguments[1].includes('test-mod'))
    })

    it('should log a warning when module has no schemaName', async () => {
      const { instance } = createInstance()
      const mod = { name: 'no-schema-mod' }
      await instance.registerModule(mod)
      const warnCalls = instance.log.mock.calls.filter(
        c => c.arguments[0] === 'warn'
      )
      assert.ok(warnCalls.length > 0)
      assert.ok(warnCalls[0].arguments[1].includes('schemaName'))
    })

    it('should not add module to modules array when schemaName is missing', async () => {
      const { instance } = createInstance()
      const mod = { name: 'no-schema-mod' }
      await instance.registerModule(mod)
      assert.equal(instance.modules.length, 0)
    })
  })

  describe('#registerSchema()', () => {
    it('should call jsonschema.extendSchema with the correct arguments', async () => {
      const { instance, mockJsonschema } = createInstance()
      const mod = { schemaName: 'mySchema' }
      await instance.registerSchema(mod)
      assert.equal(mockJsonschema.extendSchema.mock.calls.length, 1)
      const call = mockJsonschema.extendSchema.mock.calls[0]
      assert.equal(call.arguments[0], 'mySchema')
      assert.equal(call.arguments[1], 'tags')
    })

    it('should silently catch errors from extendSchema', async () => {
      const failingJsonschema = {
        registerSchemasHook: { tap: mock.fn() },
        extendSchema: mock.fn(() => { throw new Error('schema error') })
      }
      const { instance } = createInstance({
        waitForModule: mock.fn(async () => failingJsonschema)
      })
      const mod = { schemaName: 'badSchema' }
      await assert.doesNotReject(() => instance.registerSchema(mod))
    })

    it('should silently catch errors from waitForModule', async () => {
      const { instance } = createInstance({
        waitForModule: mock.fn(async () => { throw new Error('module not found') })
      })
      const mod = { schemaName: 'testSchema' }
      await assert.doesNotReject(() => instance.registerSchema(mod))
    })
  })

  describe('#registerSchemas()', () => {
    it('should call registerSchema for each registered module', async () => {
      const { instance, mockJsonschema } = createInstance()
      instance.modules = [
        { schemaName: 'schema1' },
        { schemaName: 'schema2' },
        { schemaName: 'schema3' }
      ]
      await instance.registerSchemas()
      assert.equal(mockJsonschema.extendSchema.mock.calls.length, 3)
    })

    it('should handle empty modules array', async () => {
      const { instance, mockJsonschema } = createInstance()
      instance.modules = []
      await instance.registerSchemas()
      assert.equal(mockJsonschema.extendSchema.mock.calls.length, 0)
    })
  })

  describe('#autocompleteHandler()', () => {
    it('should return mapped tag data as JSON', async () => {
      const { instance } = createInstance()
      const findResults = [
        { _id: 'id1', title: 'JavaScript' },
        { _id: 'id2', title: 'Java' }
      ]
      instance.find = mock.fn(async () => findResults)
      const jsonData = []
      const req = {
        apiData: { query: { term: 'Ja' } }
      }
      const res = {
        json: mock.fn((data) => { jsonData.push(...data) })
      }
      const next = mock.fn()
      await instance.autocompleteHandler(req, res, next)
      assert.equal(res.json.mock.calls.length, 1)
      assert.equal(jsonData.length, 2)
      assert.deepEqual(jsonData[0], { _id: 'id1', title: 'JavaScript', value: 'JavaScript' })
      assert.deepEqual(jsonData[1], { _id: 'id2', title: 'Java', value: 'Java' })
    })

    it('should query find with a regex based on the term', async () => {
      const { instance } = createInstance()
      instance.find = mock.fn(async () => [])
      const req = {
        apiData: { query: { term: 'test' } }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.autocompleteHandler(req, res, next)
      assert.equal(instance.find.mock.calls.length, 1)
      const query = instance.find.mock.calls[0].arguments[0]
      assert.ok(query.title.$regex)
      assert.equal(query.title.$regex, '^test')
    })

    it('should return empty array when no tags match', async () => {
      const { instance } = createInstance()
      instance.find = mock.fn(async () => [])
      const jsonData = []
      const req = {
        apiData: { query: { term: 'nonexistent' } }
      }
      const res = {
        json: mock.fn((data) => { jsonData.push(...data) })
      }
      const next = mock.fn()
      await instance.autocompleteHandler(req, res, next)
      assert.equal(res.json.mock.calls.length, 1)
      assert.equal(jsonData.length, 0)
    })

    it('should map value to title for each result', async () => {
      const { instance } = createInstance()
      instance.find = mock.fn(async () => [
        { _id: 'id1', title: 'React', extraProp: 'ignored' }
      ])
      let result
      const req = {
        apiData: { query: { term: 'Re' } }
      }
      const res = {
        json: mock.fn((data) => { result = data })
      }
      const next = mock.fn()
      await instance.autocompleteHandler(req, res, next)
      assert.equal(result[0].value, result[0].title)
      assert.equal(result[0].extraProp, undefined)
    })
  })

  describe('#transferHandler()', () => {
    let instance

    beforeEach(() => {
      ({ instance } = createInstance())
    })

    it('should push destId tag to all registered modules', async () => {
      const mod = {
        updateMany: mock.fn(async () => {})
      }
      instance.modules = [mod]
      const req = {
        apiData: {
          query: { _id: 'sourceTag' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.ok(mod.updateMany.mock.calls.length >= 1)
      const pushCall = mod.updateMany.mock.calls[0]
      assert.deepEqual(pushCall.arguments[0], { tags: 'sourceTag' })
      assert.deepEqual(pushCall.arguments[1], { $push: { tags: 'destTag' } })
      assert.deepEqual(pushCall.arguments[2], { rawUpdate: true })
    })

    it('should pull sourceId when deleteSourceTag is not "true"', async () => {
      const mod = {
        updateMany: mock.fn(async () => {})
      }
      instance.modules = [mod]
      const req = {
        apiData: {
          query: { _id: 'sourceTag' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.equal(mod.updateMany.mock.calls.length, 2)
      const pullCall = mod.updateMany.mock.calls[1]
      assert.deepEqual(pullCall.arguments[0], { tags: 'sourceTag' })
      assert.deepEqual(pullCall.arguments[1], { $pull: { tags: 'sourceTag' } })
      assert.deepEqual(pullCall.arguments[2], { rawUpdate: true })
    })

    it('should delete the source tag when deleteSourceTag is "true"', async () => {
      const mod = {
        updateMany: mock.fn(async () => {})
      }
      instance.modules = [mod]
      instance.delete = mock.fn(async () => ({}))
      const req = {
        apiData: {
          query: { _id: 'sourceTag', deleteSourceTag: 'true' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.equal(instance.delete.mock.calls.length, 1)
      assert.deepEqual(instance.delete.mock.calls[0].arguments[0], { _id: 'sourceTag' })
    })

    it('should not pull sourceId when deleteSourceTag is "true"', async () => {
      const mod = {
        updateMany: mock.fn(async () => {})
      }
      instance.modules = [mod]
      instance.delete = mock.fn(async () => ({}))
      const req = {
        apiData: {
          query: { _id: 'sourceTag', deleteSourceTag: 'true' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      // When deleteSourceTag is "true", it should only call $push, not $pull
      assert.equal(mod.updateMany.mock.calls.length, 1)
      assert.deepEqual(mod.updateMany.mock.calls[0].arguments[1], { $push: { tags: 'destTag' } })
    })

    it('should not delete source tag when deleteSourceTag is not "true"', async () => {
      const mod = {
        updateMany: mock.fn(async () => {})
      }
      instance.modules = [mod]
      instance.delete = mock.fn(async () => ({}))
      const req = {
        apiData: {
          query: { _id: 'sourceTag' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.equal(instance.delete.mock.calls.length, 0)
    })

    it('should handle multiple modules', async () => {
      const mod1 = { updateMany: mock.fn(async () => {}) }
      const mod2 = { updateMany: mock.fn(async () => {}) }
      instance.modules = [mod1, mod2]
      const req = {
        apiData: {
          query: { _id: 'sourceTag' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.ok(mod1.updateMany.mock.calls.length >= 1)
      assert.ok(mod2.updateMany.mock.calls.length >= 1)
    })

    it('should call next with error when delete throws', async () => {
      instance.modules = []
      instance.delete = mock.fn(async () => { throw new Error('delete failed') })
      const req = {
        apiData: {
          query: { _id: 'sourceTag', deleteSourceTag: 'true' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.equal(next.mock.calls.length, 1)
      assert.ok(next.mock.calls[0].arguments[0] instanceof Error)
    })

    it('should log a warning when a module updateMany fails', async () => {
      const mod = {
        updateMany: mock.fn(async () => { throw new Error('update failed') })
      }
      instance.modules = [mod]
      const req = {
        apiData: {
          query: { _id: 'sourceTag' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      const warnCalls = instance.log.mock.calls.filter(
        c => c.arguments[0] === 'warn'
      )
      assert.ok(warnCalls.length > 0)
      assert.ok(warnCalls[0].arguments[1].includes('Failed to transfer tag'))
    })

    it('should handle empty modules array', async () => {
      instance.modules = []
      const req = {
        apiData: {
          query: { _id: 'sourceTag' },
          data: { destId: 'destTag' }
        }
      }
      const res = { json: mock.fn() }
      const next = mock.fn()
      await instance.transferHandler(req, res, next)
      assert.equal(next.mock.calls.length, 0)
    })
  })

  describe('#insert()', () => {
    it('should return existing tag if one is found', async () => {
      const { instance } = createInstance()
      const existingTag = { _id: 'existing1', title: 'JavaScript' }
      instance.find = mock.fn(async () => [existingTag])
      const result = await instance.insert({ title: 'JavaScript' })
      assert.equal(result, existingTag)
    })

    it('should call find with the same arguments', async () => {
      const { instance } = createInstance()
      instance.find = mock.fn(async () => [{ _id: 'tag1', title: 'test' }])
      const args = { title: 'test' }
      await instance.insert(args)
      assert.equal(instance.find.mock.calls.length, 1)
      assert.equal(instance.find.mock.calls[0].arguments[0], args)
    })

    it('should call super.insert when no existing tag is found', async () => {
      const { instance } = createInstance()
      const newTag = { _id: 'new1', title: 'NewTag' }
      instance.find = mock.fn(async () => [])
      // Mock the parent insert via the prototype chain
      const parentInsert = mock.fn(async () => newTag)
      Object.getPrototypeOf(TagsModule.prototype).insert = parentInsert
      const result = await instance.insert({ title: 'NewTag' })
      assert.equal(result, newTag)
      assert.equal(parentInsert.mock.calls.length, 1)
    })

    it('should pass through all arguments to findOne', async () => {
      const { instance } = createInstance()
      instance.findOne = mock.fn(async () => ({ _id: 'tag1', title: 'test' }))
      const data = { title: 'test' }
      const options = { validate: false }
      const mongoOpts = { limit: 1 }
      await instance.insert(data, options, mongoOpts)
      const findArgs = instance.findOne.mock.calls[0].arguments
      assert.equal(findArgs[0], data)
      assert.deepEqual(findArgs[1], { validate: false, strict: false })
      assert.equal(findArgs[2], mongoOpts)
    })
  })

  describe('#delete()', () => {
    it('should call super.delete and return its result', async () => {
      const { instance } = createInstance()
      const deletedTag = { _id: 'deleted1', title: 'OldTag' }
      const parentDelete = mock.fn(async () => deletedTag)
      Object.getPrototypeOf(TagsModule.prototype).delete = parentDelete
      instance.modules = []
      const result = await instance.delete({ _id: 'deleted1' })
      assert.equal(result, deletedTag)
    })

    it('should remove deleted tag from all registered modules', async () => {
      const { instance } = createInstance()
      const deletedTag = { _id: 'tagToDelete', title: 'RemoveMe' }
      const parentDelete = mock.fn(async () => deletedTag)
      Object.getPrototypeOf(TagsModule.prototype).delete = parentDelete
      const mod1 = { updateMany: mock.fn(async () => {}) }
      const mod2 = { updateMany: mock.fn(async () => {}) }
      instance.modules = [mod1, mod2]
      await instance.delete({ _id: 'tagToDelete' })
      assert.equal(mod1.updateMany.mock.calls.length, 1)
      assert.deepEqual(mod1.updateMany.mock.calls[0].arguments[0], { tags: 'tagToDelete' })
      assert.deepEqual(mod1.updateMany.mock.calls[0].arguments[1], { $pull: { tags: 'tagToDelete' } })
      assert.deepEqual(mod1.updateMany.mock.calls[0].arguments[2], { rawUpdate: true })
      assert.equal(mod2.updateMany.mock.calls.length, 1)
    })

    it('should log a warning when module updateMany fails during delete', async () => {
      const { instance } = createInstance()
      const deletedTag = { _id: 'tagToDelete', title: 'RemoveMe' }
      const parentDelete = mock.fn(async () => deletedTag)
      Object.getPrototypeOf(TagsModule.prototype).delete = parentDelete
      const mod = {
        updateMany: mock.fn(async () => { throw new Error('update failed') })
      }
      instance.modules = [mod]
      await instance.delete({ _id: 'tagToDelete' })
      const warnCalls = instance.log.mock.calls.filter(
        c => c.arguments[0] === 'warn'
      )
      assert.ok(warnCalls.length > 0)
      assert.ok(warnCalls[0].arguments[1].includes('Failed to remove tag'))
    })

    it('should handle empty modules array', async () => {
      const { instance } = createInstance()
      const deletedTag = { _id: 'tagToDelete', title: 'RemoveMe' }
      const parentDelete = mock.fn(async () => deletedTag)
      Object.getPrototypeOf(TagsModule.prototype).delete = parentDelete
      instance.modules = []
      const result = await instance.delete({ _id: 'tagToDelete' })
      assert.equal(result, deletedTag)
    })

    it('should continue removing from other modules if one fails', async () => {
      const { instance } = createInstance()
      const deletedTag = { _id: 'tagToDelete', title: 'RemoveMe' }
      const parentDelete = mock.fn(async () => deletedTag)
      Object.getPrototypeOf(TagsModule.prototype).delete = parentDelete
      const mod1 = {
        updateMany: mock.fn(async () => { throw new Error('fail') })
      }
      const mod2 = { updateMany: mock.fn(async () => {}) }
      instance.modules = [mod1, mod2]
      await instance.delete({ _id: 'tagToDelete' })
      assert.equal(mod2.updateMany.mock.calls.length, 1)
    })
  })

  describe('#init()', () => {
    it('should tap into jsonschema registerSchemasHook', async () => {
      const { instance, mockJsonschema } = createInstance()
      // Mock super.init to be a no-op
      const origSuperInit = Object.getPrototypeOf(TagsModule.prototype).init
      Object.getPrototypeOf(TagsModule.prototype).init = mock.fn(async function () {})
      await instance.init()
      Object.getPrototypeOf(TagsModule.prototype).init = origSuperInit
      assert.equal(mockJsonschema.registerSchemasHook.tap.mock.calls.length, 1)
    })
  })
})
