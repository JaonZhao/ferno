import Vue from "vue";
import App from "./App.vue";
import { createRouter } from "./router";
import store from "./store";

import { isInMicroShell, registerProvider } from "@phenix/micro-app";

Vue.config.productionTip = false;

let vm: Vue | null = null;
if (isInMicroShell()) {
  registerProvider({
    render: ({ dom, basename, props }) => {
      const router = createRouter(basename);
      Vue.prototype.$mainStore = Vue.observable(props.store);

      vm = new Vue({
        router,
        render: (h) => h(App, { props: { basename } }),
      }).$mount();

      dom.querySelector("#app")!.appendChild(vm.$el);
    },
    destroy: ({ dom }) => {
      if (!vm) {
        return;
      }

      delete Vue.prototype.$mainStore;

      dom.querySelector("#app")?.removeChild(vm.$el);
    },
  });
} else {
  const router = createRouter();
  new Vue({
    router,
    store,
    render: (h) => h(App),
  }).$mount("#app");
}
