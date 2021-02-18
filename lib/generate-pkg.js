const path = require("path");
const fs = require("fs-extra");

function resolvePkg(dir) {
  if (!path.isAbsolute(dir))
    throw new TypeError(`please provide an absolute path (got ${dir})`);
  const pkgPath = path.resolve(dir, "package.json");
  if (fs.pathExistsSync(pkgPath)) {
    return fs.readJsonSync(pkgPath);
  } else {
    const enclosing = path.dirname(dir);
    if (enclosing === dir) return {};
    else return resolvePkg(enclosing);
  }
}

function generatePkg(config) {
  const _pkg = resolvePkg(this.resolvePath("#root"));
  const pkg = {};
  pkg.name = this.config.app.name || _pkg.name || "";

  pkg.scripts = {};
  const mainPath = path.relative(
    this.resolvePath("#output"),
    path.resolve(
      config.output.store.get("path"),
      config.output.store.get("filename") || "main.js"
    )
  );
  pkg.scripts.start = `node ${mainPath}`;
  return pkg;
}

module.exports = generatePkg;
