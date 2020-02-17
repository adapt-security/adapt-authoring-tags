const AbstractApiModule = require('adapt-authoring-api');
/**
* Module which handles tagging
* @extends {AbstractApiModule}
*/
class TagsModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    /** @ignore */ this.root = 'tags';
    /** @ignore */ this.schemaName = 'tag';
    this.useDefaultRouteConfig();
  }
}

module.exports = TagsModule;
