<template>
  <div>
    <h1>Hello World!</h1>
    <div>{{ count }}</div>
    <button @click="increment">increment</button>
    <button @click="decrement">decrement</button>
    <div></div>
    <router-link :to="{ name: 'home'}">Home</router-link>
    <router-link :to="{ name: 'about'}">About</router-link>
    <router-link :to="{ name: 'vue2'}">Vue2</router-link>
    <router-link :to="{ name: 'vite'}">Vite</router-link>
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { count } from "console";
import { mapState, mapMutations } from "vuex";

export default {
  name: 'App',
  computed: mapState(["count"]),
  methods: {
    ...mapMutations(["increment"]),
    ...mapMutations(["decrement"]),
  },
  mounted() {
    fetch("/api/auth/login", {
      method: "POST",
      headers: {
      "Content-Type": "application/json"
      },
      body: JSON.stringify({
      username: "admin",
      password: "admin"
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Login successful:", data);
    })
    .catch(error => {
      console.error("Error during login:", error);
    });
  }
}
</script>