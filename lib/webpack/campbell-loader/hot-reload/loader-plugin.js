const path = require("path");
const hotReloadAPIPath = path.resolve(__dirname, "hot-reload-api");

exports.injectCode = (ctx, code) => {
  const { isEntry, isComponent, id, resourcePath } = ctx;
  let hmrCode = "";
  // FIXME is this the right condition ?
  if (isEntry) {
    // FIXME disable reloading for root module for now (should find an alternative)
    // consider reimplementing webpack/hot/poll in order to handle async action before reload (as destroying instances is async)
    hmrCode = "module.hot.decline();";
  } else if (isComponent) {
    // TODO use module.hot.dispose ???
    // FIXME should destroy previous module before reloading ???
    hmrCode = `module.hot.accept();
  const component = module.exports;
  const api = require('${hotReloadAPIPath}');
  if (!api.componentModuleIsRegistered('${id}')) {
    api.registerComponentModule('${id}', component);
  } else {
    api.reloadComponentModule('${id}', component);
  }`;
    // FIXME:
  } else {
    hmrCode = "module.hot.accept();";
  }
  if (/\.c?js$/.test(resourcePath) && hmrCode) {
    code += `
/* hot reload */
if (module.hot) {
  ${hmrCode}
}`;
  }

  return code;
};
