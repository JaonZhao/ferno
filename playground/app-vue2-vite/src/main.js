import { createApp } from "vue";
import { isInMicroShell, registerProvider } from "ferno-remote";

import router from "./router";
import store from "./store";
import './style.css'
import App from './App.vue'

let app;
if (isInMicroShell()) {
  registerProvider({
    render: ({ dom, basename, props }) => {
      app = createApp(App);
      app.mount(
        dom ? dom.querySelector('#app') : document.querySelector('#app')
      );
    },
    destroy: ({ dom }) => {
      if (app) {
        app.unmount(
          dom ? dom.querySelector("#app") : document.querySelector("#app"),
        );
      }
    },
  });
} else {
  app = createApp(App);
  app.mount("#app");
}

