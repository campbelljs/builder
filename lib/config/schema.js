module.exports = {
  app: {
    name: {
      doc: "Apps's name",
      format: "string",
      default: "",
      env: "CAMPBELL_APP_NAME"
    }
  },
  env: {
    doc: "The builder environment.",
    format: "string",
    // ["production", "development", "test"]
    default: "production",
    env: ["CAMPBELL_ENV", "NODE_ENV"]
  },
  rootDir: {
    doc: "App's root dir",
    format: "dir",
    default: process.cwd(),
    env: "CAMPBELL_ROOTDIR"
  },
  entry: {
    doc: "Entry file (relative to rootDir)",
    format: "string",
    default: "./main"
  },
  presets: {
    doc: "Build presets",
    format: "array",
    default: []
  },
  plugins: {
    doc: "Build plugins",
    format: "array",
    default: []
  },
  injectPlugins: {
    doc: "Campbell plugins to inject (should be an absolute path)",
    format: "array",
    default: []
  },
  dir: {
    // named directories
    output: {
      doc: "Output dir",
      format: "string",
      default: "./dist"
    },
    // @campbell/server
    public: {
      doc: "Public dir where you store routers and others",
      format: "string",
      default: "./public"
    },
    static: {
      doc: "Static dir where you store assets, medias and others",
      format: "string",
      default: "./static"
    }
  },
  alias: {
    "@": { format: "string", default: "#root" }
  }
};
