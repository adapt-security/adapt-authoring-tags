const AbstractApiModule = require('adapt-authoring-api');
/**
* Module which handles tagging
* @extends {AbstractApiModule}
*/
class TagsModule extends AbstractApiModule {
  /** @override */
  static get def() {
    return {
      name: 'tags',
      schema: 'tag',
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
      const js = this.app.getModule('jsonschema');
      this.getConfig('targetModels').forEach(m => js.extendSchema(m, 'tags'));
      resolve();
    }, reject);
  }
}

module.exports = TagsModule;
