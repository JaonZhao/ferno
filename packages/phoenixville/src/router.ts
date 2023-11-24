import { MicroApp, MicroAppInfo } from "./microApp";
import CustomEvent from "./utils/customEvent";

interface RouterInfo {
  fullPath: string;
  href: string;
  path: string;
  query: Object,
  state: Object,
}

interface currentRouterInfo extends RouterInfo {
  matched: Array<MicroApp | MicroAppInfo>
}

interface RouterConfig {
  basename: string;
  current: currentRouterInfo | null;
  getMicroApps: () => Array<MicroApp | MicroAppInfo>,
  active: (microApp: MicroApp | MicroAppInfo, basename: string) => Promise<void>;
  deactive: (microApp: MicroApp | MicroAppInfo, basename: string) => Promise<void>;
}

interface RedirectInfo {
  event: keyof History | "popstate",
  redirectTo: RouterInfo,
  redirectFrom: RouterInfo,
}

const __GARFISH_ROUTER_UPDATE_FLAG__ = '__GARFISH_ROUTER_UPDATE_FLAG__';
const __GARFISH_ROUTER_FLAG__ = '__GARFISH_ROUTER_FLAG__';
const __GARFISH_BEFORE_ROUTER_EVENT__ = 'garfish:before-routing-event';

let routerConfig: RouterConfig = {
  basename: "/",
  current: {
    fullPath: "/",
    path: "/",
    href: "",
    query: {},
    state: {},
    matched: [],
  },
  getMicroApps: () => [],
  active: (microApp) => Promise.resolve(),
  deactive: (microApp) => Promise.resolve()
};

function parseQuery(query: string = "") {
  const res: { [props: string]: string[] } = {};
  if (query) {
    query
      .slice(1)
      .split('&')
      .map((item) => {
        const pairs = item.split('=');
        res[pairs[0]] = pairs;
      });
  }

  return res;
}

function getPath(basename: string = "/", pathname?: string) {
  if (basename === "/" || basename === "") {
    return pathname || location.pathname;
  } else {
    return (pathname || location.pathname).replace(
      new RegExp(`^/?${basename}`),
      '',
    );
  }
}

function hasActive(activePath: string, path: string) {
  if (activePath[0] !== "/") {
    activePath = `/${activePath}`;
  }
  if (activePath === "/" && path === activePath) {
    return true;
  }

  const activeWhenArr = activePath.split('/');
  const pathArr = path.split('/');
  let flag: boolean = true;
  activeWhenArr.forEach((pathItem: string, index: number) => {
    if (pathItem && pathItem !== pathArr[index]) {
      flag = false;
    }
  });

  return flag;
}

function createPopStateEvent(state: any, originalMethodName: string) {
  let evt;
  try {
    evt = new PopStateEvent('popstate', { state });
  } catch (err) {
    // IE 11 compatibility
    evt = document.createEvent('PopStateEvent');
    (evt as any).initPopStateEvent('popstate', false, false, state);
  }
  (evt as any).garfish = true;
  (evt as any).garfishTrigger = originalMethodName;
  return evt;
}

function callCapturedEventListeners(type: keyof History) {
  const eventArguments = createPopStateEvent(window.history.state, type);
  window.dispatchEvent(eventArguments);
}

async function redirectTo(redirectInfo: RedirectInfo) {
  const { event } = redirectInfo;

  const { current } = routerConfig;
  const deactiveApps = current!.matched.filter(
    (microApp) => {
      return !hasActive(
        microApp.activePath,
        getPath(routerConfig.basename, location.pathname)
      )
    }
  );

  const apps = routerConfig.getMicroApps();
  
  const activeApps = apps.filter((app) => { 
    return hasActive(
      app.activePath,
      getPath(routerConfig.basename, location.pathname)
    )
  });
  const needToActives = activeApps.filter(
    (app) => 
      !current!.matched.some(({ name }) => name === app.name)
  );
  const curState = history.state || {};
  if (
    event !== "popstate" &&
    curState[__GARFISH_ROUTER_UPDATE_FLAG__]
  ) {
    callCapturedEventListeners(event);
  }

  for (const deactiveApp of deactiveApps) {
    await routerConfig.deactive(deactiveApp, routerConfig.basename);
  }

  setRouterConfig({
    current: {
      path: getPath(routerConfig.basename),
      fullPath: location.pathname,
      href: location.href,
      matched: activeApps,
      state: history.state,
      query: parseQuery(location.search),
    },
  });


  for (const needToActive of needToActives) {
    await routerConfig.active(needToActive, getAppRootPath(needToActive));
  }
}

export function getAppRootPath(appInfo: MicroAppInfo) {
  // const path = getPath(routerConfig.basename, location.pathname);
  let appRootPath = routerConfig.basename === '/' ? '' : (routerConfig.basename || '');
  if (typeof appInfo.activePath === 'string') {
    appRootPath += appInfo.activePath;
  }
  return appRootPath;
}

function hijack(type: keyof History) {
  const api = history[type];
  return function (state: any, title: string, url?: string, ...rest) {
    const urlBefore = window.location.pathname + window.location.hash;
    const stateBefore = history?.state;
    const res = api.apply(window.history, [state, title, url, ...rest]);
    const urlAfter = window.location.pathname + window.location.hash;
    const stateAfter = history?.state;

    if (
      urlBefore !== urlAfter ||
      JSON.stringify(stateBefore) !== JSON.stringify(stateAfter)
    ) {
      window.dispatchEvent(
        new CustomEvent(__GARFISH_BEFORE_ROUTER_EVENT__, {
          event: "popstate",
          redirectTo: {
            fullPath: location.pathname,
            href: location.href,
            state: stateAfter,
            path: getPath(routerConfig.basename, urlAfter),
          },
          redirectFrom: {
            fullPath: location.pathname,
            href: location.href,
            state: stateBefore,
            path: getPath(routerConfig.basename, urlBefore)
          }
        })
      );
    }

    return res;
  }
}

function listenRouter() {
  
  history.pushState = hijack("pushState");
  history.replaceState = hijack("replaceState");

  window.addEventListener("popstate", (event) => {
    if (event && typeof event === "object" && (event as any).garfish) {
      return;
    }
    if (history.state && typeof history.state === "object") {
      delete history.state[__GARFISH_ROUTER_UPDATE_FLAG__];
    }
    window.dispatchEvent(
      new CustomEvent(__GARFISH_BEFORE_ROUTER_EVENT__, {
        event: "popstate",
        redirectTo: {
          fullPath: location.pathname,
          href: location.href,
          path: getPath(routerConfig.basename),
          query: parseQuery(location.search),
        },
        redirectFrom: {
          fullPath: location.pathname,
          href: location.href,
          path: getPath(routerConfig.basename, routerConfig.current!.path),
          query: parseQuery(location.search),
        }
      })
    );
  }, false);

  window.addEventListener(__GARFISH_BEFORE_ROUTER_EVENT__, function (env) {
    redirectTo(env as any);
  });
}

function setRouterConfig(config: Partial<RouterConfig>) {
  Object.assign(routerConfig, config);
}

export function listenRouterAndReDirect(routerConfig: Partial<RouterConfig>) {
  setRouterConfig(routerConfig);
  listenRouter();
}

export function initRedirect() {
  redirectTo({
    event: 'pushState',
    redirectTo: {
      fullPath: location.pathname,
      href: location.href,
      path: getPath(routerConfig.basename),
      query: parseQuery(location.search),
      state: history.state
    },
    redirectFrom: {
      fullPath: "/",
      href: "",
      path: "/",
      query: {},
      state: {},
    }
  });
}

export function push({ path, query, basename }: {
  path: string,
  query?: { [key: string]: string },
  basename?: string
}) {

}

export function replace({ path, query, basename }: {
  path: string,
  query?: { [key: string]: string },
  basename?: string
}) {

}