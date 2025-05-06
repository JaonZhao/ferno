<template>
  <div class="about">
    <h1>This is an about page</h1>
    <!-- <lbs-map center="116.403619,39.919851" zoom="12" /> -->
  </div>
</template>

<script lang="ts">
export default {
  name: "AboutView",
};
</script>
<!-- <script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "AboutView",
  created() {
    console.log("AboutView created");
  },
  mounted() {
    console.log("AboutView created");
    try {
      // 引入百度地图API script
      // window.baiduMapApiCb = () => {
      //   console.log('baiduMapApiCb');
      // };
      const baiduMapKey = "uwuep8m1OthSJZ4CJNca51jYJBA7Dt6G";
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${baiduMapKey}&&callback=baiduMapApiCb`;
      document.body.appendChild(script);
      // document.addEventListener('plusready', this.mountMbs);
    } catch (error) {
      console.log(error);
    }
  },
});
</script> -->
