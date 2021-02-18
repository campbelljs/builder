const path = require("path");
const fs = require("fs-extra");

const tapable = require("tapable");

const _mergeWith = require("lodash/mergeWith");

const webpack = require("webpack");

const { resolveConfig } = require("./config");

class Builder {
  constructor(_config) {
    this.config = resolveConfig(_config);

    this._campbell_path = path.resolve(require.resolve("campbell"), "..", "..");
    if (process.env.CAMPBELL_PATH)
      this._campbell_path = process.env.CAMPBELL_PATH;

    this.hooks = {};

    this.registerHook("build:before", "AsyncParallel", ["builder"]);
    this.registerHook("build", "AsyncParallel", ["builder"]);
    this.registerHook("done", "Sync");
  }
  async init() {
    if (this._initialized) {
      console.warning("Already initialized");
      return;
    }
    this.applyPreset(
      require(path.resolve(this._campbell_path, "build", "preset"))
    );
    this.config.presets.forEach(preset => this.applyPreset(preset));

    this.plugins = await this.getPlugins();
    this.plugins.forEach((plugin, i) => {
      if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
          if (!(hookName in this.hooks))
            throw new Error(`Unknown hook ${hook}`);
          const hook = this.hooks[hookName];

          const tapMode = hook.constructor.name.startsWith("Async")
            ? "tapPromise"
            : "tap";

          hook[tapMode](`plugins:${i}`, handler);
        });
      }
    });

    this._initialized = true;
  }
  async build() {
    await this.init();
    await this.hooks["build:before"].promise(this);
    const { isDev } = this;

    let webpackConfig = this.createWebpackConfig();
    const compiler = webpack(webpackConfig);

    const outputPath = webpackConfig.output.path;
    await fs.ensureDir(outputPath);
    if (!isDev) await fs.emptyDir(outputPath);

    await this.hooks["build"].promise(this);
    let stats = await new Promise((resolve, reject) => {
      const onCompilationDone = (err, stats) => {
        if (err) {
          console.error("Compilation Failed");
          reject(err);
          return;
        }
        console.log(
          stats.toString({
            colors: true,
            // equivalent to preset "minimal"
            all: false,
            modules: true,
            maxModules: 0,
            errors: true,
            warnings: true,
            logging: "warn"
          })
        );
        if (stats.hasErrors()) {
          console.log("Compiled with errors");
          reject(stats);
        } else {
          console.log("Compiled without errors");
          resolve(stats);
        }
      };
      let done = false;

      if (isDev) {
        compiler.watch(
          {
            aggregateTimeout: 300,
            poll: 1000
          },
          onCompilationDone
        );
      } else {
        compiler.run(onCompilationDone);
      }
    });

    return stats;
  }
  applyPreset(preset) {
    if (typeof preset === "function") {
      preset.call(this, this.config);
    } else {
      this.injectConfig(preset);
    }
  }
  injectConfig(...sources) {
    const customizer = (objValue, srcValue) => {
      if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
    };
    _mergeWith(this.config, ...sources, customizer);
  }
  async getPlugins() {
    const plugins = [];
    for (let declaration of this.config.plugins) {
      const plugin = require(declaration);
      if (typeof plugin === "function") {
        plugins.push(await plugin(this));
      } else {
        plugins.push(plugin);
      }
    }
    return plugins;
  }
  registerHook(name, hookDeclaration, ...args) {
    if (name in this.hooks) {
      throw new Error(`Hook ${name} already registered`);
    }
    let hook;
    if (typeof hookDeclaration === "string") {
      let HookConstructor =
        tapable[`${hookDeclaration.replace(/Hook$/, "")}Hook`];
      if (!HookConstructor) {
        throw new Error(
          `UnknownHookType: can't find hook type with name '${hookDeclaration}'`
        );
      } else {
        hook = new HookConstructor(...args);
      }
    } else {
      hook = hookDeclaration;
    }
    this.hooks[name] = hook;
  }
  get isDev() {
    return this.config.get("env") === "development";
  }
  get isProduction() {
    return this.config.get("env") === "production";
  }
  resolvePath(src) {
    const pathArr = [];
    if (typeof src === "string") {
      pathArr.push(...src.split(path.sep));
    } else if (Array.isArray(src)) {
      pathArr.push(...src);
    } else {
      throw new TypeError(`Path must be an array or a string. Got: ${src}`);
    }

    const ROOT_DIR = this.config.get("rootDir");
    const aliases = {};
    const ensureAbsolute = _path =>
      path.isAbsolute(_path) ? _path : path.resolve(ROOT_DIR, _path);
    aliases["#root"] = ROOT_DIR;
    Object.entries(this.config.dir).forEach(([name, _path]) => {
      aliases[`#${name}`] = ensureAbsolute(_path);
    });
    Object.entries(this.config.alias).forEach(([name, _path]) => {
      const _pathArr = _path.split(path.sep);
      if (_pathArr[0] in aliases)
        aliases[`${name}`] = path.resolve(
          aliases[_pathArr[0]],
          ..._pathArr.slice(1)
        );
      else aliases[`${name}`] = ensureAbsolute(_path);
    });
    if (pathArr[0] === ".") {
      return path.resolve(ROOT_DIR, ...pathArr);
    } else if (pathArr[0] in aliases) {
      return path.resolve(aliases[pathArr[0]], ...pathArr.slice(1));
    } else {
      return ensureAbsolute(pathArr.join(path.sep));
    }
  }
}
Builder.prototype.createWebpackConfig = require("./webpack").createWebpackConfig;
Builder.prototype.generatePkg = require("./generate-pkg");

module.exports = Builder;
