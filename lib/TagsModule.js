import AbstractApiModule from 'adapt-authoring-api'
/**
 * Module which handles tagging
 * @memberof tags
 * @extends {AbstractApiModule}
 */
class TagsModule extends AbstractApiModule {
  /** @override */
  async setValues () {
    /** @ignore */ this.root = 'tags'
    /** @ignore */ this.schemaName = 'tag'
    /** @ignore */ this.schemaExtensionName = 'tags'
    /** @ignore */ this.collectionName = 'tags'
    /**
     * Module registered for tags
     * @type {Array<AbstractApiModule>}
     */
    this.modules = []

    this.useDefaultRouteConfig()

    this.routes = [{
      route: '/autocomplete',
      handlers: { get: this.autocompleteHandler.bind(this) },
      permissions: { get: ['read:content'] },
      meta: {
        get: {
          summary: 'Retrieve tags for UI autocomplete',
          description: 'A streamlined query API to allow searching of tag data.',
          parameters: [{ name: 'term', in: 'query', description: 'Search term', required: true }],
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        title: { type: 'string' },
                        value: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }, ...this.routes]
    // make title unique
    const mongodb = await this.app.waitForModule('mongodb')
    return mongodb.setIndex(this.collectionName, 'title', { unique: true })
  }

  /**
   * Registers a module for use with this plugin
   * @param {AbstractApiModule} mod
   */
  async registerModule (mod) {
    if (!mod.schemaName) {
      return this.log('warn', 'cannot register module, module doesn\'t define a schemaName')
    }
    const jsonschema = await this.app.waitForModule('jsonschema')
    jsonschema.extendSchema(mod.schemaName, this.schemaExtensionName)

    this.log('debug', `registered ${mod.name} for use with tags`)
    this.modules.push(mod)
  }

  /**
   * A handler for autocompletion of tags
   * @param {external:ExpressRequest} req
   * @param {external:ExpressResponse} res
   * @param {Function} next
   */
  async autocompleteHandler (req, res, next) {
    res.json((await this.find({ title: { $regex: `^${req.apiData.query.term}` } })).map(m => {
      return {
        _id: m._id,
        title: m.title,
        value: m.title
      }
    }))
  }

  /** @override */
  async insert (...args) {
    // allow attempts to create tags that already exist
    const [tag] = await this.find(...args)
    if (tag) return tag
    return super.insert(...args)
  }

  /** @override */
  async delete (...args) {
    const { _id } = await super.delete(...args)
    return Promise.all(this.modules.map(async m => {
      const docs = await m.find({ tags: _id })
      return Promise.all(docs.map(async d => {
        try {
          await m.update({ _id: d._id }, { $pull: { tags: _id } }, { rawUpdate: true })
        } catch (e) {
          this.log('warn', `Failed to remove tag, ${e}`)
        }
      }))
    }))
  }
}

export default TagsModule
