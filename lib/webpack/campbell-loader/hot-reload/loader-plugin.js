const path = require("path");
const hotReloadAPIPath = path.resolve(__dirname, "hot-reload-api");

exports.injectCode = (ctx, code) => {
  const { isComponent, id, resourcePath } = ctx;
  let hmrCode = "module.hot.accept();\n";
  if (isComponent) {
    hmrCode += `
  const component = module.exports;
  const api = require('${hotReloadAPIPath}')
  if (!api.isRecorded('${id}')) {
    api.createRecord('${id}', component)
  } else {
    api.reload('${id}', component)
  }`;
    // FIXME:
  } else if (/\.c?js$/.test(resourcePath)) {
    code += `
/* hot reload */
if (module.hot) {
  ${hmrCode}
}`;
  }

  return code;
};
