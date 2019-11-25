const { AbstractModule } = require('adapt-authoring-core');
const authoredSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "authored",
  "description": "Adds properties relating to authoring",
  "type": "object",
  "properties": {
    "createdAt": {
      "type": "string"
    },
    "createdBy": {
      "type": "string"
    },
    "updatedAt": {
      "type": "string"
    }
  },
  "required": ["createdAt","createdBy","updatedAt"]
};
/**
*
* @extends {AbstractModule}
*/
class AuthoredModule extends AbstractModule {
  preload(app, resolve, reject) {
    super.preload(app, () => {
      const _preload = () => {
        app.getModule('jsonschema').extendSchema('course', authoredSchema);
        app.getModule('mongodb').createHook.tap(this.updateAuthoredValues);
        resolve();
      };
      const courses = app.getModule('courses');
      if(!courses.hasPreloaded) return courses.on('preload', _preload);
      _preload();
    }, reject);
  }
  updateAuthoredValues(d) {
    return new Promise((resolve, reject) => {
      if(!d.createdAt) d.createdAt = new Date().toISOString();
      if(!d.updatedAt) d.updatedAt = new Date().toISOString();
      resolve(d);
    });
  }
}

module.exports = AuthoredModule;
