const AbstractApiModule = require('adapt-authoring-api');
const TagSchema = require('../schema/tag.schema.json');
const TagsSchema = require('../schema/tags.schema.json');

const AuthoredModule = require('./authoredModule');
let authoredModule;
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
  constructor(app, pkg) {
    super(app, pkg);
    authoredModule = new AuthoredModule(app, {});
  }
  preload(app, resolve, reject) {
    super.preload(app, () => {
      app.getModule('courses').on('preload', () => {
        app.getModule('jsonschema').extendSchema('course', TagsSchema);
        authoredModule.preloadDelegate(this.app).then(resolve).catch(reject);
      });
    }, reject);
  }
  /** @override */
  boot(app, resolve, reject) {
    super.boot(app, () => {
      const db = this.app.getModule('mongodb');
      db.isConnected ? this.extendSchemas() : db.on('boot', this.extendSchemas.bind(this));
      authoredModule.bootDelegate(this.app).then(resolve).catch(reject);
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
      this.app.getModule('jsonschema').extendSchema('course', TagsSchema);
    } catch(e) {
      return this.log('warn', `${this.app.lang.t('error.tagextend', { model: name })}, ${e}`);
    }
  }
}

module.exports = TagsModule;
