const path = require("path");

module.exports = {
  injectContext(ctx) {
    ctx.isComponent = /\/\* component \*\//.test(ctx.source);
    ctx.isPlugin = /\/\* plugin \*\//.test(ctx.source);
    ctx.isEntry =
      ctx._compilation.options.entry.app.import[ctx.isDev ? 1 : 0] ===
      ctx._module.resource;
  },
  injectCode(ctx, code) {
    if (ctx.isComponent) {
      const filePath = ctx.rawShortFilePath;
      const fileName = path.basename(filePath);
      // Expose filename. This is used by the devtools and Vue runtime warnings.
      if (!ctx.isProduction) {
        // Expose the file's full path in development, so that it can be opened
        // from the devtools.
        code += `\nmodule.exports.__file = ${JSON.stringify(
          filePath.replace(/\\/g, "/")
        )};`;
      } else if (this.exposeFilename) {
        // Libraries can opt-in to expose their components' filenames in production builds.
        // For security reasons, only expose the file's basename in production.
        code += `\nmodule.exports.__file = ${JSON.stringify(fileName)};`;
      }
    } else if (ctx.isEntry) {
      const pluginsToInject = ctx.builder.config.injectPlugins;
      if (pluginsToInject.length) {
        code =
          `
(() => {
  const Campbell = require("campbell");
${pluginsToInject.map((src) => `  Campbell.use(require("${src}"));\n`)}
})();
` + code;
      }
    }
    return code;
  },
};
