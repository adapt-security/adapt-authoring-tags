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
    /** @ignore */ this.schemaExtensionName = 'tags';
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
  /** @override */
  async delete(...args) {
    const { _id } = await super.delete(...args);
    return Promise.all(this.modules.map(async m => {
      const docs = await m.find({ tags: _id });
      return Promise.all(docs.map(async d => {
        try {
          await m.update({ _id: d._id }, { $pull: { tags: _id } }, { rawUpdate: true });
        } catch(e) {
          this.log('warn', `Failed to remove tag, ${e}`);
        }
      }));
    }));
  }
}

module.exports = TagsModule;
