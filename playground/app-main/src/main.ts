import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

import { registerMicroApps, start } from "ferno-host";

registerMicroApps([{
  name: "microApp1",
  host: "http://localhost:8081/",
  activePath: "/vue2",
  el: "#root",
  props: {
    store,
  },
},{
  name: "microApp2",
  host: "http://localhost:8000/",
  activePath: "/vite",
  el: "#root1",
},{
  name: "microApp3",
  host: "http://localhost:9000/",
  activePath: "/vite2",
  el: "#root1",
}]);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");

start({ basename: "/" });