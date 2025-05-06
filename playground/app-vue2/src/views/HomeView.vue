<template>
  <div>
    <div>This is Home</div>
  </div>
</template>

<script lang="ts">
export default {
  name: "HomeView",
  data() {
    return {
      center: { lng: 116.404, lat: 39.915 },
      zoom: 15,
      map: null,
      BMap: null,
    };
  },
  methods: {
    loadBMap() {
      return new Promise((resolve, reject) => {
        
        /* eslint-disable */
        window.onBMapCallback = () => { // eslint-disable-next-line
          /* eslint-disable */
          this.BMap = window.BMap;
          resolve(true);
        };

        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `https://api.map.baidu.com/api?v=3.0&ak=uwuep8m1OthSJZ4CJNca51jYJBA7Dt6G&callback=onBMapCallback`;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    },
  },
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}
</style>
