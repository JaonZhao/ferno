import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

import {
  registerMicroApps,
  start
// @ts-ignore
} from "@phoenix/ville";

registerMicroApps([{
  name: "microApp1",
  host: "http://localhost:8081/",
  activePath: "/vue2",
  el: "#root",
  props: {
    store,
  },
}, {
  name: "microApp2",
  host: "http://localhost:3000/",
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