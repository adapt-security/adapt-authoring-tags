const AbstractApiModule = require('adapt-authoring-api');
/**
* Module which handles tagging
* @extends {AbstractApiModule}
*/
class TagsModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    this.root = 'tags';
    this.schema = 'tag';
    this.routes = [{
      route: '/:_id?',
      handlers: ['post','get','put','delete']
    }];
  }
  /** @override */
  async init() {
    const jsonschema = await this.app.waitForModule('jsonschema');
    this.getConfig('targetModels').forEach(m => jsonschema.extendSchema(m, 'tags'));
    this.setReady();
  }
}

module.exports = TagsModule;
