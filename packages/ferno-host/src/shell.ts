import {
  listenRouterAndReDirect,
  initRedirect,
} from "./router";
import {
  MicroApp,
  MicroAppInfo,
  hideMicroApp,
  isError,
  isLoaded,
  isUnload,
  isUnmount,
  loadMicroApp,
  mountMicroApp,
  registerMicroApp,
  showMicroApp,
  unmountMicroApp
} from "./microApp";

interface Config {
  basename: string;
}

const microApps: Record<MicroApp["name"], MicroApp | MicroAppInfo> = {};
let started = false;

function getMicroApps() {
  return Object.keys(microApps).map((key) => microApps[key]);
}

function updateMicroApp(microApp: MicroApp) {
  const name = microApp.name;
  microApps[name] = microApp;
  return microApp;
}

export function start(config: Config) {
  if (started) {
    return;
  }

  const active = async (microApp: MicroApp, basename: string) => {
    if (isUnload(microApp) || isError(microApp)) {
      microApp = await loadMicroApp(microApp, basename); 
    }

    if (isLoaded(microApp) || isUnmount(microApp)) {
      microApp = await mountMicroApp(microApp); 
    }

    updateMicroApp(microApp);
  };
  const deactive = async (microApp: MicroApp, basename: string) => {
    microApp = await unmountMicroApp(microApp); 
    updateMicroApp(microApp);
  };

  const routerConfig = {
    basename: config.basename,
    getMicroApps,
    active,
    deactive,
  };

  listenRouterAndReDirect(routerConfig);
  initRedirect();

  started = true;
}

export function registerMicroApps(microAppInfos: Array<MicroAppInfo>) {
  for (const microAppInfo of microAppInfos) {
    const microApp = registerMicroApp(microAppInfo);
    const name = microApp.name;
    microApps[name] = microApp;
  }
}