const AbstractApiModule = require('adapt-authoring-api');
const TagSchema = require('../schema/tag.schema');
const TagJsonSchema = require('../schema/tag.schema.json');
/**
* Module which handles tagging
* @extends {AbstractApiModule}
*/
class TagsModule extends AbstractApiModule {
  /** @override */
  static get def() {
    return {
      name: 'tags',
      model: 'tag',
      schemas: [TagSchema],
      routes: [
        {
          route: '/:_id?',
          handlers: ['post','get','put','delete']
        }
      ]
    };
  }
  preload(app, resolve, reject) {
    super.preload(app, () => {
      app.getModule('courses').on('preload', () => {
        app.getModule('jsonschema').extendSchema('course', TagJsonSchema);
        app.getModule('jsonschema').extendSchema('course', {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "title": "authored",
          "description": "Adds properties relating to authoring",
          "type": "object",
          "properties": {
            "createdAt": {
              "type": "string"
            },
            "createdBy": {
              "type": "string"
            },
            "updatedAt": {
              "type": "string"
            }
          },
          "required": ["createdAt","createdBy","updatedAt"]
        });
        resolve();
      });
    }, reject);
  }
  /** @override */
  boot(app, resolve, reject) {
    super.boot(app, () => {
      const db = this.app.getModule('mongodb');
      db.isConnected ? this.extendSchemas() : db.on('boot', this.extendSchemas.bind(this));
      resolve();
    }, reject);
  }
  /**
  * Calls extendSchema on all specified models
  */
  extendSchemas() {
    const targetModels = this.getConfig('targetModels');
    targetModels.length && targetModels.forEach(this.extendSchema, this);
  }
  /**
  * Adds tag field to schema with passed name
  * @param {String} name Name of schema to extend
  */
  extendSchema(name) {
    try {
      const m = this.app.getModule('mongodb').getModel(name);
      m.extendSchema({ tags: ['ObjectId'] });
    } catch(e) {
      return this.log('warn', `${this.app.lang.t('error.tagextend', { model: name })}, ${e}`);
    }
  }
}

module.exports = TagsModule;
