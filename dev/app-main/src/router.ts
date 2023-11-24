import Vue from 'vue';
import VueRouter from "vue-router";

Vue.use(VueRouter);

import About from "./views/about.vue";
import Home from "./views/home.vue";
import Vue2 from "./views/vue2.vue";
import vue3 from "./views/vue3.vue";
import vite from "./views/vite.vue"

const routes = [{
  path: "/",
  name: "home",
  component: Home,
}, {
  path: "/about",
  name: "about",
  component: About,
}, {
  path: "/vue2",
  name: "vue2",
  component: Vue2,
  }, {
  path: "/vue3",
  name: "vue3",
  component: vue3,
  }, {
  path: "/vite",
  name: "vite",
  component: vite
}];

export default new VueRouter({
  mode: 'history',
  routes
});
