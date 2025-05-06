<script setup>
import { onMounted, ref } from "vue";

import HelloWorld from './components/HelloWorld.vue'
import ImgLogo from './assets/logo.png';

let BMap;
const mapContainer = ref(null);;
const loadBMap = () => new Promise((resolve, reject) => {
  window.onBMapCallback = () => {
    BMap = window.BMap
    resolve()
  }

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = `https://api.map.baidu.com/api?v=3.0&ak=uwuep8m1OthSJZ4CJNca51jYJBA7Dt6G&callback=onBMapCallback`
  script.onerror = reject
  document.head.appendChild(script)
})
const initMap = () => {
  const map = new BMap.Map(mapContainer.value);
  const point = new BMap.Point(116.404, 39.915);
  map.centerAndZoom(point, 15)
  map.enableScrollWheelZoom()
}

onMounted(() => {
  fetch("/api/users", {
    method: "POST",
    headers: {
    "Content-Type": "application/json"
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log("Fetched data:", data);
  })
  .catch(error => {
    console.error("Error fetching data:", error);
  });
  
  loadBMap()
    .then(() => {
      initMap();
    });
});

</script>

<template>
  <div>
    <div class="map-container">
      <div ref="mapContainer" style="height: 300px;" class="map"></div>
    </div>
  </div>
</template>

<style lang="less" scoped>
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
