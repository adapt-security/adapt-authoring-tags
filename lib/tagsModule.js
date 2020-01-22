const AbstractApiModule = require('adapt-authoring-api');
/**
* Module which handles tagging
* @extends {AbstractApiModule}
*/
class TagsModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    super.setValues();
    this.root = 'tags';
    this.schema = 'tag';
    this.useDefaultRouteConfig();
  }
}

module.exports = TagsModule;
