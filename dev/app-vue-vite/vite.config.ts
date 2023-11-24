import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
// import portMap from '../app-main/config';

const appName = 'dev/vite';
// const port = portMap[appName].port;

export default ({ mode }) => {
  // process.env = {
  //   ...process.env,
  //   ...loadEnv(mode, process.cwd()),
  // };
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
