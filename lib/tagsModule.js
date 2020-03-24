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
    this.useDefaultRouteConfig();
    const auth = await this.app.waitForModule('auth');
    auth.permissions.secureRoute('/api/tags', 'post', ['write:tags']);
    auth.permissions.secureRoute('/api/tags', 'get', ['read:tags']);
    auth.permissions.secureRoute('/api/tags', 'put', ['write:tags']);
    auth.permissions.secureRoute('/api/tags', 'delete', ['write:tags']);
  }
}

module.exports = TagsModule;
