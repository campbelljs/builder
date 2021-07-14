// const Campbell = require("campbell");
// const CampbellHMRApiPlugin = {
//   install(Campbell) {
//     Campbell.mixin({
//       created() {
//         if (this.$root === this) {
//           console.debug(`[HMR api] root instance detected (uid: ${this._uid})`);
//           API.rootInstances.add(this);
//         }
//       },
//     });
//   },
// };

function makeOptionsHot(id, options) {
  injectHook(options, "beforeCreate", function () {
    const record = API.getComponentModuleRecord(id);
    if (!record.Ctor) {
      record.Ctor = this.constructor;
    }
    record.instances.push(this);
  });
  injectHook(options, "beforeDestroy", function () {
    const instances = API.getComponentModuleRecord(id).instances;
    instances.splice(instances.indexOf(this), 1);
  });
}
function injectHook(options, name, hook) {
  const existing = options[name];
  options[name] = existing
    ? Array.isArray(existing)
      ? existing.concat(hook)
      : [existing, hook]
    : [hook];
}
function updateOptions(oldOptions, newOptions) {
  for (const key in oldOptions) {
    if (!(key in newOptions)) {
      delete oldOptions[key];
    }
  }
  for (const key in newOptions) {
    oldOptions[key] = newOptions[key];
  }
}
function tryWrap(fn) {
  return function () {
    try {
      return fn.apply(this, arguments);
    } catch (e) {
      console.error(e);
      console.warn("Something went wrong during Campbell component hot-reload");
    }
  };
}

const API = {
  // init
  // TODO: find a way to reload root modules
  // initialized: false,
  // init() {
  //   if (this.initialized) return;
  //   Campbell.use(CampbellHMRApiPlugin);
  //   this.initialized = true;
  // },
  // components
  componentModules: Object.create(null),
  getComponentModuleRecord(id) {
    return this.componentModules[id];
  },
  registerComponentModule(id, options) {
    if (this.componentModuleIsRegistered(id)) return;
    console.debug(`[HMR api] creating record for module: ${id}`);
    let Ctor = null;
    if (typeof options === "function") {
      Ctor = options;
      options = Ctor.options;
    }
    makeOptionsHot(id, options);
    this.componentModules[id] = {
      Ctor,
      options,
      instances: [],
    };
  },
  componentModuleIsRegistered(id) {
    return typeof this.getComponentModuleRecord(id) !== "undefined";
  },
  reloadComponentModule: tryWrap(function reload(id, options) {
    console.debug(`[HMR api] reloading module: ${id}`);
    const record = this.getComponentModuleRecord(id);
    if (options) {
      if (typeof options === "function") {
        options = options.options;
      }
      makeOptionsHot(id, options);
      if (record.Ctor) {
        const newCtor = record.Ctor.super.extend(options);
        console.debug(`[HMR api] created new constructor: ${newCtor.cid}`);
        // prevent record.options._Ctor from being overwritten accidentally
        newCtor.options._Ctor = record.options._Ctor;
        record.Ctor.options = newCtor.options;
        record.Ctor.cid = newCtor.cid;
        record.Ctor.prototype = newCtor.prototype;
      } else {
        updateOptions(record.options, options);
      }
    }
    function reload(cm) {
      console.debug(`[HMR api] reloading instance with id: ${cm._uid}`);
      cm.$forceReload();
    }
    record.instances.slice().forEach(reload);
  }),
  // root
  // rootModules: new Set(),
  // rootInstances: new Set(),
  // globalDestroyPending: false,
  // registerRootModule(id) {
  //   this.rootModules.add(id);
  // },
  // rootModuleIsRegistered(id) {
  //   return this.rootModules.has(id);
  // },
  // destroyAll: tryWrap(async function destroyAll() {
  //   console.debug(`[HMR api] destroying all instances`);
  //   this.globalDestroyPending = true;
  //   await Promise.all(Array.from(this.rootInstances).map((i) => i.$destroy()));
  //   this.rootInstances.clear();
  //   this.globalDestroyPending = false;
  //   console.debug(`[HMR api] all instances destroyed`);
  // }),
  // rootReloadIsAllowed() {
  //   return !this.globalDestroyPending && this.rootInstances.size === 0;
  // },
};
module.exports = API;
