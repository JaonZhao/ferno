import { createApp } from 'vue';
import App from './App.vue';
import { isInMicroShell, registerProvider } from "@phenix/micro-app";

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