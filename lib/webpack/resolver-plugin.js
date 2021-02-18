const path = require("path");

// TODO: this needs to be tested

class SearchPathsResolverPlugin {
  constructor() {}
  apply(resolver) {
    const target = resolver.ensureHook("module");
    resolver
      .getHook("raw-module")
      .tapAsync(
        "SearchPathsResolverPlugin",
        (request, resolveContext, callback) => {
          if (request.request === "fs-extra") {
            // console.log(request);
          }
          const resolveWithPath = _path => {
            const _request = {
              ...request,
              path: path.resolve(_path, "node_modules"),
              request: "./" + request.request,
              module: false
            };
            return resolver.doResolve(
              target,
              _request,
              "looking for modules in " + _request.path,
              resolveContext,
              (err, result) => {
                if (err) callback(err);
                else if (result) {
                  callback(null, result);
                } else {
                  const enclosing = path.dirname(_path);
                  if (enclosing !== _path) resolveWithPath(enclosing);
                  else callback();
                }
              }
            );
          };
          resolveWithPath(request.path);
        }
      );
  }
}

module.exports = SearchPathsResolverPlugin;
