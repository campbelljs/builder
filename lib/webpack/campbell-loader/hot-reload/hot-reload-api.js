const map = Object.create(null);

function makeOptionsHot(id, options) {
  injectHook(options, "beforeCreate", function () {
    const record = map[id];
    if (!record.Ctor) {
      record.Ctor = this.constructor;
    }
    record.instances.push(this);
  });
  injectHook(options, "beforeDestroy", function () {
    const instances = map[id].instances;
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
      fn.apply(this, arguments);
    } catch (e) {
      console.error(e);
      console.warn("Something went wrong during Campbell component hot-reload");
    }
  };
}

exports.createRecord = (id, options) => {
  if (map[id]) return;
  console.debug(`[HMR api] creating record for module: ${id}`);
  let Ctor = null;
  if (typeof options === "function") {
    Ctor = options;
    options = Ctor.options;
  }
  makeOptionsHot(id, options);
  map[id] = {
    Ctor,
    options,
    instances: [],
  };
};

exports.isRecorded = (id) => {
  return typeof map[id] !== "undefined";
};

exports.reload = tryWrap((id, options) => {
  console.debug(`[HMR api] reloading module: ${id}`);
  const record = map[id];
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
});
