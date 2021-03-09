const path = require("path");
const fs = require("fs-extra");
const webpack = require("webpack");

const ChainableWebpackConfig = require("webpack-chain");
const { merge: wpMerge } = require("webpack-merge");

const nodeExternals = require("webpack-node-externals");
const GeneratePackageJsonPlugin = require("generate-package-json-webpack-plugin");

const { CleanWebpackPlugin } = require("clean-webpack-plugin");

function createWebpackConfig() {
  const builder = this;
  const { isDev } = this;
  const config = new ChainableWebpackConfig();
  config.context(this.resolvePath("#root"));

  config
    .mode(isDev ? "development" : "production")
    .target("node")
    .devtool("source-map");
  config.output
    .libraryTarget("commonjs2")
    .path(this.resolvePath(["#output", "main"]))
    .filename("index.js");

  config.resolve
    .plugin("ParentDirsResolution")
    .use(require("./resolver-plugin"));

  const loaderPlugins = require("./campbell-loader/plugins");
  this.plugins.forEach((plugin) => {
    if ("loader" in plugin) {
      loaderPlugins.load(plugin["loader"]);
    }
  });
  config.module
    .rule("campbell")
    .test(/\.js(\?.*)?/)
    .use("campbell-loader")
    .loader(path.resolve(__dirname, "campbell-loader"))
    .options({ builder: this, plugins: loaderPlugins });

  config.plugin("CleanWebpackPlugin").use(CleanWebpackPlugin);
  config.plugin("NoEmitOnErrors").use(webpack.NoEmitOnErrorsPlugin);
  if (isDev) {
    config.plugin("HMR").use(webpack.HotModuleReplacementPlugin);
  }

  let appEntry = config.entry("app");
  const webpackHotPollEntry = require.resolve("webpack/hot/poll") + "?1000";
  if (isDev) appEntry.add(webpackHotPollEntry);

  let appEntrySrc;
  try {
    appEntrySrc = require.resolve(this.resolvePath(this.config.entry));
  } catch (e) {
    appEntrySrc = path.resolve(__dirname, "default-entry.js");
  }
  appEntry.add(appEntrySrc);

  const externals = [
    nodeExternals({
      allowlist: isDev ? [webpackHotPollEntry] : [],
    }),
  ];
  config.externals(externals);
  const basePkg = this.generatePkg(config);
  config
    .plugin("generate-package.json")
    .use(GeneratePackageJsonPlugin, [basePkg]);
  config.plugin("move-package.json").use(
    class MovePackageJsonPlugin {
      constructor() {}
      apply(compiler) {
        compiler.hooks.done.tap("MovePackageJson", (compilation) => {
          const OUTPUT_DIR = builder.resolvePath("#output");
          fs.moveSync(
            path.resolve(OUTPUT_DIR, "main", "package.json"),
            path.resolve(OUTPUT_DIR, "package.json"),
            { overwrite: true }
          );
        });
      }
    }
  );

  this.plugins.forEach((plugin) => {
    if ("chainWebpack" in plugin) {
      plugin.chainWebpack.call(this, config);
    }
  });

  let configObj = config.toConfig();

  this.plugins.forEach((plugin) => {
    if ("configureWebpack" in plugin) {
      if (typeof plugin.configureWebpack === "function") {
        plugin.configureWebpack.call(this, config);
      } else {
        configObj = wpMerge(configObj, plugin.configureWebpack);
      }
    }
  });

  return configObj;
}
exports.createWebpackConfig = createWebpackConfig;
