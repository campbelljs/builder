const path = require("path");
const fs = require("fs-extra");

const Alton = require("alton");
Alton.registerFormat("dir", {
  validate(val) {
    if (!fs.pathExistsSync(val) || !fs.lstatSync(val).isDirectory())
      throw new Error(`${val} is not a directory`);
  }
});

const schema = require("./schema");
exports.schema = schema;

function createConfig(opts = {}) {
  const alton = new Alton(schema);
  const config = alton.load(opts);
  config.validate();
  return config;
}
exports.createConfig = createConfig;

function resolveConfigPath(dir) {
  const matching = fs
    .readdirSync(dir)
    .find(name => /campbell\.config(\.js(on)?)?$/.test(name));
  return path.resolve(dir, matching);
}

function resolveConfig(opts) {
  if (typeof opts === "object") {
    return createConfig(opts);
  } else if (typeof opts === "string") {
    const configPath = resolveConfigPath(opts);
    if (!configPath) throw new Error("invalid config path");
    else {
      let obj = require(configPath);
      return createConfig(obj);
    }
  } else return createConfig();
}
exports.resolveConfig = resolveConfig;
