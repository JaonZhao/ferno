<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import HelloWorld from "@/components/HelloWorld.vue"; // @ is an alias to /src

console.log("HomeView");

export default Vue.extend({
  name: "HomeView",
  data: function () {
    return {
      ref: null,
    };
  },
  components: {
    HelloWorld,
  },
  // beforeCreate() {
  //   console.log("HomeView");
  // },
  // created() {},
  mounted() {
    console.log("This is HomeView");
  },
});
</script>
