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
  /** @override */
  async init() {
    const jsonschema = await this.app.waitForModule('jsonschema');
    this.getConfig('targetModels').forEach(m => jsonschema.extendSchema(m, 'tags'));
    await super.init();
  }
}

module.exports = TagsModule;
