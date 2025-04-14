import { listenerModule } from "./modules/eventListener";
import { historyModule } from "./modules/history";
import { networkModule } from "./modules/network";
import { localStorageModule } from "./modules/storage";
import { timeoutModule, intervalModule } from "./modules/timer";
import { uiEventOverride } from "./modules/uiEvent";
import { documentModule } from "./modules/document";
import {
  createGetter,
  createSetter,
  createDefineProperty,
  createDeleteProperty,
  createHas
} from "./proxyInterceptor/global";
import { createFakeObject, isPromise, makeMap } from "./helper";
import { makeElementInjector, sandboxMap } from "./injector";
import { MicroApp } from "../microApp";
import { Compiler } from "./compiler";
import { transformUrl } from "./url";
import { isJavaScript, request } from "../loader";

export interface SandboxRuntime {
  id: string;
  microAppId: string;
  host: string;
  el: Element | null;
  execScript: Sandbox["execScript"];
  deferClearEffects: Set<() => void>;
  dynamicStyleSheetElementSet: Set<any>;
  styledComponentCSSRulesMap: WeakMap<HTMLStyleElement, any>;
}

interface OverridesData {
  recover?: () => void;
  prepare?: () => void;
  created?: (context: Record<PropertyKey, any>) => void;
  override?: Record<PropertyKey, any>;
}

type Module = (sandboxRuntime: SandboxRuntime) => OverridesData | void;

export interface ReplaceGlobalVariables {
  recoverList: Array<OverridesData['recover']>;
  prepareList: Array<OverridesData['prepare']>;
  createdList: Array<OverridesData['created']>;
  overrideList: Record<PropertyKey, any>;
}

export interface Sandbox {
  start: () => void;
  reset: () => void;
  awaitCompletion: () => Promise<void>;
  execScript: (
    code: string,
    env: Record<PropertyKey, any>,
    url: string,
    options: {
      async?: boolean;
      defer?: boolean;
      isModule?: boolean;
      isInline?: boolean;
    }
  ) => void
}

function createProxyWindow(keys: Array<string> = [], replaceGlobalVariables: ReplaceGlobalVariables) {
  const fakeWindow = createFakeObject(
    window,
    makeMap([]),
    makeMap(keys),
  );
  const baseHandlers = {
    get: createGetter(replaceGlobalVariables),
    set: createSetter(),
    defineProperty: createDefineProperty(),
    deleteProperty: createDeleteProperty(),
    getPrototypeOf: () => Object.getPrototypeOf(window),
  };
  const parentHandlers = {
    ...baseHandlers,
    has: createHas(),
    getPrototypeOf: () => Object.getPrototypeOf(window),
  };

  const proxy = new Proxy(fakeWindow, parentHandlers);
  const subProxy = new Proxy(fakeWindow, baseHandlers);
  proxy.self = subProxy;
  proxy.window = subProxy;
  proxy.globalThis = subProxy;

  return proxy;
}

function createReplaceableVariables(modules: Array<Module>, sandboxRuntime: SandboxRuntime) {
  const recoverList: ReplaceGlobalVariables["recoverList"] = [];
  const createdList: ReplaceGlobalVariables["createdList"] = [];
  const prepareList: ReplaceGlobalVariables["prepareList"] = [];
  const overrideList: ReplaceGlobalVariables["overrideList"] = {};

  for (const module of modules) {
    if (typeof module !== "function") {
      continue;
    }

    const { recover, override, created, prepare } = module(sandboxRuntime) || {};
    if (recover) {
      recoverList.push(recover);
    }
    if (created) {
      createdList.push(created);
    }
    if (prepare) {
      prepareList.push(prepare)
    }
    if (override) {
      Object.keys(override)
        .forEach(key => {
          overrideList[key] = override[key];
        })
    }
  }

  return {
    recoverList,
    createdList,
    prepareList,
    overrideList
  };
}

interface Defer {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}
class Queue {
  private fx: Array<Function> = [];
  private init = true;
  private lock = false;
  private finishDefers = new Set<Defer>();

  private next() {
    if (!this.lock) {
      this.lock = true;
      if (this.fx.length === 0) {
        this.init = true;
        this.finishDefers.forEach((d) => d.resolve());
        this.finishDefers.clear();
      } else {
        const fn = this.fx.shift();
        if (fn) {
          fn(() => {
            this.lock = false;
            this.next();
          });
        }
      }
    }
  }

  public add(fn: (next: () => void) => void) {
    this.fx.push(fn);
    if (this.init) {
      this.lock = false;
      this.init = false;
      this.next();
    }
  }

  public awaitCompletion() {
    if (this.init) return Promise.resolve();
    const defer = {} as Defer;
    this.finishDefers.add(defer);
    return new Promise((resolve, reject) => {
      defer.resolve = resolve;
      defer.reject = reject;
    });
  }
}

export function createSandbox(microApp: MicroApp) {
  const dynamicStyleSheetElementSet = new Set();
  const deferClearEffects: SandboxRuntime["deferClearEffects"] = new Set();
  const styledComponentCSSRulesMap = new WeakMap();
  
  const replaceableVariables: ReplaceGlobalVariables = {
    createdList: [],
    prepareList: [],
    recoverList: [],
    overrideList: {},
  };
  const modules = [
    listenerModule,
    historyModule,
    networkModule,
    localStorageModule,
    timeoutModule,
    intervalModule,
    uiEventOverride,
    documentModule,
  ];
  const runtime: SandboxRuntime = {
    get el() {
      return microApp.rootNode;
    },
    get id() {
      return microApp.name;
    },
    get host() {
      return microApp.host;
    },
    dynamicStyleSheetElementSet,
    deferClearEffects,
    styledComponentCSSRulesMap,
    execScript: (code, env, url, options) => { },
    microAppId: ""
  }

  let closed = true;
  let global = {};

  const start = () => { 
    closed = false;
    const { 
      recoverList,
      createdList,
      prepareList,
      overrideList
    } = createReplaceableVariables(modules, runtime);
    replaceableVariables.recoverList = recoverList;
    replaceableVariables.createdList = createdList;
    replaceableVariables.prepareList = prepareList;
    replaceableVariables.overrideList = overrideList;

    global = createProxyWindow(Object.keys(overrideList), replaceableVariables);
    if (overrideList && global) {
      for (const key in overrideList) {
        global[key] = overrideList[key];
      }
    }

    if (createdList) {
      createdList.forEach((fn) => fn && fn(global));
    }
  };
  const close = () => { 
    if (closed) {
      return;
    }

    closed = true;
    global = {};

    // Object
    //   .keys(resource)
    //   .forEach((key) => {
    //     delete resource[key];
    //   });
    Object
      .keys(memoryModules)
      .forEach(key => {
        delete memoryModules[key];
      });

    replaceableVariables.createdList = [];
    replaceableVariables.prepareList = [];
    replaceableVariables.recoverList = [];
    replaceableVariables.overrideList = [];
    dynamicStyleSheetElementSet.clear();

    deferClearEffects.forEach(fn => fn && fn());
    deferClearEffects.clear();
  };

  makeElementInjector(window);
  
  start();

  const esmQueue = new Queue();
  const resource = {};
  const memoryModules = {};
  const execScript = createExecutionEngine(
    resource,
    memoryModules,
    esmQueue,
    global,
    replaceableVariables
  );

  sandboxMap.set(runtime);

  return {
    start: () => { 
      start();
    },
    reset: () => {
      close();
      start();
    },
    awaitCompletion: () => {
      return esmQueue.awaitCompletion();
    },
    execScript,
    dynamicStyleSheetElementSet,
    styledComponentCSSRulesMap
  }
}


// When the string is set as the object property name,
// it will be attempted to be transformed into a constant version to avoid repeated caching by the browser
function internFunc(internalizeString) {
  // Don't consider "Hash-collision，https://en.wikipedia.org/wiki/Collision_(computer_science)"
  // v8 貌似在 16383 长度时会发生 hash-collision 经过测试后发现正常
  const temporaryOb = {};
  temporaryOb[internalizeString] = true;
  return Object.keys(temporaryOb)[0];
}

function createExecParams(env: Record<PropertyKey, any>, replaceableVariables: ReplaceGlobalVariables, global: any) {
  const { prepareList, overrideList } = replaceableVariables;
  if (prepareList) {
    prepareList.forEach((fn) => fn && fn());
  }

  const params = {
    window: global,
    ...overrideList,
  };
  params["__GARFISH_SANDBOX_ENV_VAR__"] = env;
  
  return params;
}

function evalWithEnv(
  code: string,
  params: Record<string, any>,
  context: any
) {
  const nativeWindow = (0, eval)("window");
  const randomValKey = '__garfish__exec_temporary__';
  const contextKey = '__garfish_exec_temporary_context__';
  const keys = Object.keys(params);
  const values = keys.map((k) => `window.${randomValKey}.${k}`);

  try {
    nativeWindow[randomValKey] = params;
    nativeWindow[contextKey] = context;

    const evalInfo = [
      `;(function(${keys.join(",")}){`,
      `\n}).call(window.${contextKey}, ${values.join(",")})`
    ];
    
    const internalizeString = internFunc(evalInfo[0] + code + evalInfo[1]);
    (0, eval)(internalizeString);
  } catch (e) {
    throw e;
  } finally {
    delete nativeWindow[randomValKey];
    delete nativeWindow[contextKey];
  }
}

type Resources = Record<PropertyKey, any>;
type MemoryModules = Record<string, Record<PropertyKey, any>>;
function Module() {}

export function createModule(memoryModule) {
  const module = new Module();
  Object.setPrototypeOf(module, null);
  Object.defineProperty(module, Symbol.toStringTag, {
    value: 'Module',
    writable: false,
    enumerable: false,
    configurable: false,
  });

  Object.keys(memoryModule).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(memoryModule, key);
    if (!descriptor) {
      throw TypeError(`can't get ${key} descriptor`);
    }
    const getter = descriptor.get;
    Object.defineProperty(module, key, {
      enumerable: true,
      configurable: false,
      get: getter,
      set: () => {
        throw TypeError(
          `Cannot assign to read only property '${key}' of object '[object Module]`,
        );
      },
    });
  });

  Object.seal(module);
  return module;
}

function createExecutionEngine(
  resources: Resources,
  memoryModules: MemoryModules,
  esmQueue: Queue,
  context: Record<PropertyKey, any>,
  replaceableVariables: ReplaceGlobalVariables,
) {
  const modules = new WeakMap();
  
  const execCode = (code: string, env: Record<PropertyKey, any>) => {
    const params = createExecParams(env, replaceableVariables, context);
    const tempEnvKeys = Object.keys(env);
    let preCode = "";
    if (tempEnvKeys.length > 0) {
      preCode = tempEnvKeys.reduce((pre, cur) => {
        return `${pre} let ${cur} = __GARFISH_SANDBOX_ENV_VAR__.${cur};`;
      }, "");
    }

    evalWithEnv(
      `${preCode + code}`,
      params,
      context
    );
  };

  const importModule = (env, storeId: string, requestUrl?: string) => {
    let memoryModule = memoryModules[storeId];
    if (!memoryModule) {
      const get = () => {
        const output = resources[storeId];
        if (!output) {
          throw new Error(`Module '${storeId}' not found`);
        }
        memoryModule = memoryModules[storeId] = {};
        const provider = generateProvider(output, memoryModule, env);
        execCode(output.code, Object.assign({}, env, provider));
        // console.log(storeId, output.code, memoryModule);
        return memoryModule;
      };
      if (requestUrl) {
        const res = fetchAndCompileModule(storeId, requestUrl);
        if (isPromise(res)) return res.then(() => get());
      }
      return get();
    }

    return memoryModule;
  };
  const importByUrl = (env: Record<PropertyKey, any>, storeId: string, requestUrl?: string) => {
    const result = importModule(storeId, requestUrl || storeId);
    return Promise.resolve(result).then((memoryModule) => {
      return getModule(memoryModule);
    });
  };
  const generateProvider = (output, memoryModule, env) => { 
    return {
      [Compiler.keys.__VIRTUAL_IMPORT_META__]: createImportMeta(output.realUrl),
      [Compiler.keys.__VIRTUAL_NAMESPACE__]: (memoryModule) => getModule(memoryModule),
      [Compiler.keys.__VIRTUAL_IMPORT__]: (moduleId: string) => {
        const storeId = transformUrl(output.storeId, moduleId);
        return importModule(env, storeId);
      },
      [Compiler.keys.__VIRTUAL_DYNAMIC_IMPORT__]: (moduleId: string) => { 
        const storeId = transformUrl(output.storeId, moduleId);
        const requestUrl = transformUrl(output.realUrl, moduleId);
        return importByUrl(env, storeId, requestUrl);
      },
      [Compiler.keys.__VIRTUAL_EXPORT__]: (exportObject) => {
        Object.keys(exportObject).forEach(key => {
          Object.defineProperty(memoryModule, key, {
            enumerable: true,
            get: exportObject[key],
            set: () => {
                throw new TypeError('Assignment to constant variable.');
              },
          });
        });
      },
    }
  };
  const getModule = (memoryModule) => {
    if (!modules.has(memoryModule)) {
      modules.set(memoryModule, createModule(memoryModule));
    }
    return modules.get(memoryModule);
  };
  const fetchAndCompileModule = (storeId: string, url?: string) => { 
    if (resources[storeId]) {
      return
    }
    if (!url) {
      url = storeId;
    }

    const p = request(url)
      .then(async ({type, content}) => {
        if (isJavaScript(type)) {
          const output = await analysisModule(content, storeId, url!);
          resources[storeId] = output;
        } else {
          delete resources[storeId];
        }
      });
    return resources[storeId] = p;
  };
  const analysisModule = async (code: string, storeId: string, baseRealUrl: string) => {
    const compiler = new Compiler({
      code,
      storeId,
      runtime: { resources },
      filename: storeId,
    });
    const { imports, generateCode } = compiler.transform();

    await Promise.all(
      imports.map(({ moduleId }) => {
        const curStoreId = transformUrl(storeId, moduleId);
        const requestUrl = transformUrl(storeId, moduleId);
        return resources[curStoreId]
          ? null
          : fetchAndCompileModule(curStoreId, requestUrl);
      })
    );

    const output = await generateCode();
    output["storeId"] = storeId;
    output["realUrl"] = baseRealUrl;
    return output;
  }
  const importByCode = async (code: string, env: Record<PropertyKey, any>, storeId: string, metaUrl?: string) => {
    if (!metaUrl) metaUrl = storeId;
    const memoryModule = {};
    const output = await analysisModule(code, storeId, metaUrl);
    const provider = generateProvider(output, memoryModule, env);

    execCode(output.code, Object.assign({}, env, provider));
    
    return getModule(memoryModule);
  };

  return (
    code: string,
    env: Record<PropertyKey, any>,
    url: string = "",
    options: {
      async?: boolean;
      defer?: boolean;
      isModule?: boolean;
      isInline?: boolean;
    }
  ) => {
    const { isModule } = options;
    if (isModule) {
      esmQueue.add(async (next) => {
        await importByCode(code, env, url);
        next();
      });
    } else {
      execCode(code, env);
    }
    // console.log("modules", modules);
    // console.log("resources", resources);
  }
}

function createImportMeta(url: string) {
  const metaObject = Object.create(null);
  const set = (key, value) => {
    Object.defineProperty(metaObject, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };

  set('url', url);
  set('__garfishPolyfill__', true);
  return { meta: metaObject };
}