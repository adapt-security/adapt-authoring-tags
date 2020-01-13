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
    this.routes = [
      {
        route: '/',
        handlers: { post: AbstractApiModule.requestHandler() }
      },
      {
        route: '/:_id?',
        handlers: {
          get: AbstractApiModule.requestHandler(),
          put: AbstractApiModule.requestHandler()
        }
      },
      {
        route: '/:_id?',
        handlers: { delete: AbstractApiModule.requestHandler() }
      }
    ];
  }
  /** @override */
  async init() {
    const jsonschema = await this.app.waitForModule('jsonschema');
    this.getConfig('targetModels').forEach(m => jsonschema.extendSchema(m, 'tags'));
    this.setReady();
  }
}

module.exports = TagsModule;
