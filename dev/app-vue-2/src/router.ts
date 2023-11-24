import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import HomeView from "./views/HomeView.vue";

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/about/*",
    name: "about",
    component: () =>
      import(/* webpackChunkName: "about" */ "./views/AboutView.vue"),
  },
];

export function createRouter(basename = "/") {
  return new VueRouter({
    mode: "history",
    base: basename,
    routes,
  });
}
