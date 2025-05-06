import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import HomeView from "./views/HomeView.vue";
import About from "./views/AboutView.vue";

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
    component: About,
  },
];

export function createRouter(basename = "/") {
  return new VueRouter({
    mode: "history",
    base: basename,
    routes,
  });
}
