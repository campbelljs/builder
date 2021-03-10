const path = require("path");

const hash = require("hash-sum");
const { getOptions } = require("loader-utils");

module.exports = function (source) {
  const ctx = {};

  Object.assign(ctx, this);
  Object.assign(ctx, getOptions(this) || {});
  const { isDev, isProduction } = ctx.builder;
  Object.assign(ctx, { isDev, isProduction });

  const plugins = ctx.plugins;

  const { resourcePath, resourceQuery } = ctx;

  const rawShortFilePath = path
    .relative(this.rootContext, resourcePath)
    .replace(/^(\.\.[/\\])+/, "");
  const shortFilePath = rawShortFilePath.replace(/\\/g, "/") + resourceQuery;
  // module id for hot-reload
  const id = hash(
    isProduction || this.minimize
      ? shortFilePath + "\n" + source.replace(/\r\n/g, "\n")
      : shortFilePath
  );
  Object.assign(ctx, { id, rawShortFilePath, shortFilePath });

  this.cacheable();
  let code = source;
  plugins.injectContext(ctx);
  code = plugins.injectCode(ctx, code);

  if (isDev) {
    code = require("./hot-reload/loader-plugin").injectCode(ctx, code);
  }

  return code;
};
