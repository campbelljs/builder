const Campbell = require("campbell");

const App = Campbell.getComponent("App");

const app = new App();

app.$mount().then(() => {
  app.start();
});
