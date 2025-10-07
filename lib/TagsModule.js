import AbstractApiModule from 'adapt-authoring-api'
/**
 * Module which handles tagging
 * @memberof tags
 * @extends {AbstractApiModule}
 */
class TagsModule extends AbstractApiModule {
  /** @override */
  async init () {
    await super.init()
    const jsonschema = await this.app.waitForModule('jsonschema')
    jsonschema.registerSchemasHook.tap(this.registerSchemas.bind(this))
  }

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
    }, {
      route: '/transfer/:_id',
      handlers: { post: this.transferHandler.bind(this) },
      permissions: { post: ['write:content'] },
      modifying: false,
      meta: {
        post: {
          summary: 'Transfer tag',
          description: 'Transfers all items using one tag for another.'
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
    await this.registerSchema(mod)
   
    this.log('debug', `registered ${mod.name} for use with tags`)
    this.modules.push(mod)
  }

  /**
   * Register single module schema
   */
  async registerSchema (mod) {
    try {
      const jsonschema = await this.app.waitForModule('jsonschema')
      jsonschema.extendSchema(mod.schemaName, this.schemaExtensionName)
    } catch(e) {}
  }
  
  /**
   * Registers module schemas
   */
  async registerSchemas () {
    this.modules.forEach(mod => this.registerSchema(mod))
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

  /**
   * Transfers items using a source tag to a different destination tag
   * @param {external:ExpressRequest} req
   * @param {external:ExpressResponse} res
   * @param {Function} next
   */
  async transferHandler (req, res, next) {
    const sourceId = req.apiData.query._id
    const destId = req.apiData.data.destId
    try {
      await Promise.all(this.modules.map(async m => {
        try {
          await m.updateMany({ tags: sourceId }, { $push: { tags: destId } }, { rawUpdate: true })
          if(req.apiData.query.deleteSourceTag !== 'true') await m.updateMany({ tags: sourceId }, { $pull: { tags: sourceId } }, { rawUpdate: true })
        } catch (e) {
          this.log('warn', `Failed to transfer tag, ${e}`)
        }
      }))
      if(req.apiData.query.deleteSourceTag === 'true') {
        await this.delete({ _id: sourceId })
      }
    } catch(e) {
      next(e)
    }
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
    const data = await super.delete(...args)
    await Promise.all(this.modules.map(async m => {
      try {
        await m.updateMany({ tags: data._id }, { $pull: { tags: data._id } }, { rawUpdate: true })
      } catch (e) {
        this.log('warn', `Failed to remove tag, ${e}`)
      }
    }))
    return data
  }
}

export default TagsModule
