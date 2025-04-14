import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

const appName = 'dev/vite';
// const port = portMap[appName].port;

export default ({ mode }) => {
  return defineConfig({
    base: `http://localhost:3000`,
    server: {
      port: 3000,
      cors: true,
      origin: `http://localhost:3000`,
    },
    plugins: [vue()],
  });
};
