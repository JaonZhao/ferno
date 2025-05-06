<template>
  <div class="map-container">
    <div ref="mapContainer" style="height: 300px;" class="map"></div>
  </div>
</template>

<script>
export default {
  name: "App",
  data() {
    return {
      center: { lng: 116.404, lat: 39.915 },
      zoom: 15,
      map: null,
      BMap: null,
    }
  },
  async mounted() {
    await this.loadBMap()
    this.initMap()
  },
  methods: {
    loadBMap() {
      return new Promise((resolve, reject) => {
        window.onBMapCallback = () => {
          this.BMap = BMap
          resolve()
        }

        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = `https://api.map.baidu.com/api?v=3.0&ak=uwuep8m1OthSJZ4CJNca51jYJBA7Dt6G&callback=onBMapCallback`
        script.onerror = reject
        document.head.appendChild(script)
      })
    },
    initMap() {
      const { BMap } = this
      this.map = new BMap.Map(this.$refs.mapContainer)
      const point = new BMap.Point(this.center.lng, this.center.lat)
      this.map.centerAndZoom(point, this.zoom)
      this.map.enableScrollWheelZoom()
      
    }
  }
}
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