const HOOKS = ["injectContext", "injectCode"];

const plugins = {
  options: {},
  injectContext(ctx) {
    const handlers = this.options["injectContext"];
    for (let handler of handlers) {
      handler.call(this, ctx);
    }
  },
  injectCode(ctx, code) {
    const handlers = this.options["injectCode"];
    for (let handler of handlers) {
      code = handler.call(this, ctx, code);
      if (!code)
        throw new Error("injectCode handlers must return the whole code");
    }
    return code;
  },
  getPlugin(ctx) {
    if ("plugin" in ctx) return ctx.plugin;
    let plugin = null;
    if (ctx.config) {
      const plugins = ctx.config.get("plugins");
      plugin =
        plugins.find((plugin) =>
          new RegExp(`^${plugin.entry}`).test(ctx.loader.resourcePath)
        ) || null;
    }
    // cache
    ctx.plugin = plugin;
    return plugin;
  },
  //
  load(opts = {}) {
    HOOKS.forEach((name) => {
      if (opts[name]) {
        let handlers = opts[name];
        if (Array.isArray(handlers)) this[name].push(...handlers);
        else if (typeof handlers === "function")
          this.options[name].push(handlers);
      }
    });
  },
};
HOOKS.forEach((name) => {
  plugins.options[name] = [];
});

// load default plugins
plugins.load(require("./main"));

module.exports = plugins;
