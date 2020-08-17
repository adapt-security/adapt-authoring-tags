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
    /** @ignore */ this.collectionName = 'tags';
    /**
    * Module registered for tags
    * @type {Array<AbstractApiModule>}
    */
    this.modules = [];
    this.useDefaultRouteConfig();
  }
  /**
  * Registers a module for use with this plugin
  * @param {AbstractApiModule} mod
  */
  async registerModule(mod) {
    if(!mod.schemaName) {
      return this.log('warn', `cannot register module, module doesn't define a schemaName`);
    }
    const jsonschema = await this.app.waitForModule('jsonschema');
    jsonschema.extendSchema(mod.schemaName, this.schemaExtensionName);

    this.modules.push(mod);
  }
}

module.exports = TagsModule;
