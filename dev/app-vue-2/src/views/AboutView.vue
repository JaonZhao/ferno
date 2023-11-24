<template>
  <div class="about">
    <h1>This is an about page</h1>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

console.log("AboutView");

export default Vue.extend({
  name: "AboutView",
  // beforeCreate() {
  //   console.log("AboutView");
  // },
  // created() {
  //   console.log("AboutView");
  // },
  mounted() {
    console.log("This is AboutView");
  },
});
</script>
