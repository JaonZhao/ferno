import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

import {
  registerMicroApps,
  start
// @ts-ignore
} from "@phenix/micro-shell";

registerMicroApps([{
  name: "microApp1",
  host: "http://localhost:8080/",
  activePath: "/vue2",
  el: "#root",
  props: {
    store,
  },
}, {
  name: "microApp2",
  host: "http://localhost:3002/",
  activePath: "/vite",
  el: "#root1",
}]);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");

start({basename: "/"});