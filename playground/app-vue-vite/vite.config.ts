import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

const appName = 'dev/vite';
// const port = portMap[appName].port;

export default ({ mode }) => {
  return defineConfig({
    plugins: [vue()],
    server: {
      port: 8000,
      // proxy: {
      //   '/api': {
      //     target: 'http://localhost:3000', // Replace with your API server
      //     changeOrigin: true,
      //     rewrite: (path) => path.replace(/^\/api/, ''),
      //   },
      // },
    },
  });
};
