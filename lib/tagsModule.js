const AbstractApiModule = require('adapt-authoring-api');
const TagSchema = require('../schema/tag.schema.json');
const TagsSchema = require('../schema/tags.schema.json');
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
  boot(app, resolve, reject) {
    super.boot(app, () => {
      this.extendSchemas();
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
      this.app.getModule('jsonschema').extendSchema(name, TagsSchema);
    } catch(e) {
      return this.log('warn', `${this.app.lang.t('error.tagextend', { model: name })}, ${e}`);
    }
  }
}

module.exports = TagsModule;
