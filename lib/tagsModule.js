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
  }
  /** @override */
  async init() {
    const jsonschema = await this.app.waitForModule('jsonschema');
    this.getConfig('targetModels').forEach(m => jsonschema.extendSchema(m, 'tags'));
    this.setReady();
  }
}

module.exports = TagsModule;
