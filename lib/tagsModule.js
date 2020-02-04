const AbstractApiModule = require('adapt-authoring-api');
/**
* Module which handles tagging
* @extends {AbstractApiModule}
*/
class TagsModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    super.setValues();
    /** @ignore */ this.root = 'tags';
    /** @ignore */ this.schema = 'tag';
    this.useDefaultRouteConfig();
  }
}

module.exports = TagsModule;
