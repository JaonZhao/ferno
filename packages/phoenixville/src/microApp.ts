import postcss from "postcss";
import { 
  compileDocument,
  getAttribute,
  paintDom
} from "./utils/domtree";
import { isCss, isHtml, isJavaScript, request } from "./loader";
import { Sandbox, createSandbox } from "./sandbox";
import { 
  isAbsoluteUrl,
  transformUrl
} from "./utils/path";
import { deepmerge } from "./utils/object";
import { createElement, removeElement, setAttribute } from "./utils/dom";
import { rebuildCSSRules } from "./sandbox/injector";

const loading = {};

enum MicroAppStatus {
  UNLOAD = "UNLOAD",
  LOADING = "LOADING",
  LOADED = "LOADED",
  UNMOUNT = "UNMOUNT",
  MOUNTING = "MOUNTING",
  MOUNTED = "MOUNTED",
  ERROR = "ERROR",
}

export interface MicroAppInfo {
  name: string;
  el: string;
  activePath: string;
  host: string;
  props?: Record<PropertyKey, any>
}

export interface MicroApp extends MicroAppInfo {
  id: string;
  basename?: string;
  status: MicroAppStatus;
  cjsModule: {
    exports: Record<PropertyKey, any>;
  },
  customExports: {
    [key: PropertyKey]: any;
  },
  htmlAST: Array<any>;
  assets: Record<PropertyKey, { url: string, content: string, type: string }>;
  sandbox: Sandbox;
  provider: () => void;
  template: Element | null;
  rootNode: Element | null;
}

export function hideMicroApp(microApp: MicroApp) { 
  return microApp;
}

export function showMicroApp(microApp: MicroApp) { 
  return microApp;
}

async function transformCss(content: string, scope: string) {
  const parser = postcss();

  parser
    .use({
      postcssPlugin: "postcss-add-css-scope",
      prepare: () => ({
        Rule: (rule) => {
          const scopeSelector = `#${scope}`;
          const selectors = rule.selector.split(",").map((tag) => {
            if (tag === "html" || tag === ":root") {
              return scopeSelector + " div[__phenixin_html__]";
            } else if (tag === "head") {
              return "div[__phenixin_head__]";
            } else if (tag === "body") {
              return "div[__phenixin_body__]";
            } else {
              return scopeSelector + " " + tag
            }
          });
          
          rule.selector = selectors.length > 1 ? selectors.join(",") : selectors[0];
        }
      }),
    });
  
  return (await parser.process(content)).css;
}

function createExecScriptEnv(microApp: MicroApp) {
  const envs = {
    __GARFISH_EXPORTS__: microApp.customExports,
  };

  return {
    ...envs,
    ...microApp.cjsModule,
  }
}

interface Script {
  code: string;
  url: string;
  options: {
    async?: boolean;
    defer?: boolean;
    isModule?: boolean;
    isInline?: boolean;
  }
}

function execAsyncScripts(scripts: Array<Script>, env: Record<PropertyKey, any>, sandbox: Sandbox) {
  return new Promise((resolve) => {
    setTimeout(() => { 
      for (const script of scripts) {
        execScript(script, env, sandbox);
      }
      resolve(true);
    });
  })
}

function execDeferScripts(scripts: Array<Script>, env: Record<PropertyKey, any>, sandbox: Sandbox) {
  for (const script of scripts) {
    execScript(script, env, sandbox);
  }
}

function execScript(script: Script, env: Record<PropertyKey, any>, sandbox: Sandbox
) {
  sandbox.execScript(script.code, env, script.url, script.options);
}

function updateMicroApp(microApp: MicroApp, props: Record<PropertyKey, any>) {
  return deepmerge(microApp, props);
}

function handleAssets(doc: Document, host: string) {
  const scripts = Array
    .from(doc.querySelectorAll("script"))
    .filter((script) => !!script.src)
    .map(async (script) => {
      const { content, type } = await request(
        isAbsoluteUrl(script.src)
          ? script.src
          : transformUrl(host, script.src)
      );
      return {
        url: script.src,
        type,
        content,
      }
    });
  const links = Array
    .from(doc.querySelectorAll("link"))
    .filter(link => link.rel === "stylesheet" && !!link.href)
    .map(async (link) => {
      const { content, type } = await request(
        isAbsoluteUrl(link.href)
          ? link.href
          : transformUrl(host, link.href)
      );
      return {
        url: link.href,
        type,
        content,
      }
    });  
  
  return {
    scripts,
    links
  }
}

function delay(duration) {
  return new Promise(function (resolve) {
    setTimeout(resolve, duration);
  });
}

async function getRenderNode(str: string) {
  let renderNode;

  const waitElementReady = (selector, callback, leftTime) => {
    const timeInterval = 50;
    const elem = document.querySelector(selector);

    if (elem !== null || leftTime <= 0) {
      callback(elem);
      return;
    }

    setTimeout(function () {
      waitElementReady(selector, callback, leftTime - timeInterval);
    }, timeInterval);
  }
  const waitElement = (selector, timeout = 3000) => {
    const waitPromise = new Promise(function (resolve) {
      waitElementReady(
        selector,
        function (elem: Element) {
          return resolve(elem);
        },
        timeout,
      );
    });
    return Promise.race([delay(timeout), waitPromise]);
  }

  renderNode = await waitElement(str);

  return renderNode;
}

export async function mountMicroApp(microApp: MicroApp) {
  try {
    microApp.status = MicroAppStatus.MOUNTING;

    microApp.customExports.registerProvider = (provide) => {
      microApp.provider = provide;
    };

    const sandbox = microApp.sandbox;
    const env = createExecScriptEnv(microApp);
    // TODO: 存在bug, 当多个子应用的id相同时会存在渲染失败的问题
    const root = await getRenderNode(microApp.el);
    if (!root) {
      throw new Error("找不到root");
    }
    
    microApp.rootNode = root;

    const deferScripts: Array<Script> = [];
    const asyncScripts: Array<Script> = [];

    const htmlAST = microApp.htmlAST;
    const fixNodeBaseUrl = (node) => {
      if (!node.attrs || !node.attrs.src) {
        return node;
      }

      return isAbsoluteUrl(node.attrs.src)
        ? node.attrs.src
        : transformUrl(microApp.host, node.attrs.src);
    };
    await paintDom(htmlAST, root, {
      html: (node) => ({ ...node, tag: "div", attrs: { id: microApp.id, __phenixin_html__: "" } }),
      head: (node) => ({ ...node, tag: "div", attrs: { __phenixin_head__: "" } }),
      title: () => null,
      meta: () => null,
      body: (node) => ({ ...node, tag: "div", attrs: { __phenixin_body__: "" } }),
      img: (node) => fixNodeBaseUrl(node),
      video: (node) => fixNodeBaseUrl(node),
      audio: (node) => fixNodeBaseUrl(node),
      iframe: (node) => fixNodeBaseUrl(node),
      style: async (node) => {
        let content = node.content[0] || "";
        content = await transformCss(content, microApp.id);
        return {
          ...node,
          content: [content]
        }
      },
      link: async (node) => {
        const rel = getAttribute(node, "rel");
        const href = getAttribute(node, "href");
        if (rel !== "stylesheet" || !href) {
          return;
        }

        const src = isAbsoluteUrl(href)
          ? href
          : transformUrl(microApp.host, href);
        const asset = microApp.assets[src];
        if (!asset) {
          return;
        }
        
        if (isJavaScript(asset.type)) {
          return;
        } else if (!isCss(asset.type)) {
          return;
        }

        const text = await transformCss(asset.content, microApp.id);
        return {
          tag: "style",
          content: [text]
        }
      },
      script: (node) => {
        const async = getAttribute(node, "async") !== undefined;
        const defer = getAttribute(node, "defer") !== undefined;
        const isModule = getAttribute(node, "type") === "module";
        let src = getAttribute(node, "src");
        const isInline = !src;
        const assets = microApp.assets;
        src = isAbsoluteUrl(src)
            ? src
            : transformUrl(microApp.host, src);
        
        let content: string;
        if (!isInline && assets[src]) {
          content = assets[src].content;
        } else {
          content = node.content[0];
        }

        const attrStr = Object.keys(node.attrs || {})
          .map((key) => ({ key, value: getAttribute(node, key) }))
          .reduce((str, { key, value }) => str + `${key}="${value}" `, "");
        const comment = isInline
          ? `<script ${attrStr} execute by phenixin>${content}</script>`
          : `<script ${attrStr} execute by phenixin></script>`;

        const script = {
          code: content,
          url: src,
          options: {
            async,
            defer,
            isInline,
            isModule
          }
        };

        if (async) {
          asyncScripts.push(script);
        } else if (defer) {
          deferScripts.push(script);
        } else {
          execScript(script, env, sandbox);
        }

        return {
          comment
        };
      },
    });
    const dom = root;
    
    execDeferScripts(deferScripts, env, sandbox);
    
    await sandbox.awaitCompletion();
    
    const name = microApp.name;
    const basename = microApp.basename;
    const provider = microApp.provider;
    const props = microApp.props;
    // @ts-ignore
    if (provider && provider.render) {
      
      // @ts-ignore
      provider.render({
        name,
        basename,
        dom,
        props
      });
    }
    
    // @ts-ignore
    const dynamicStyleSheetElementSet = sandbox.dynamicStyleSheetElementSet;
    // @ts-ignore
    const styledComponentCSSRulesMap = sandbox.styledComponentCSSRulesMap; 
    console.log("dynamicStyleSheetElementSet", dynamicStyleSheetElementSet);
    console.log("styledComponentCSSRulesMap", styledComponentCSSRulesMap);
    rebuildCSSRules(dynamicStyleSheetElementSet, styledComponentCSSRulesMap);

    await execAsyncScripts(asyncScripts, env, sandbox);
    microApp.status = MicroAppStatus.MOUNTED;

    return microApp;
  } catch (error) {
    console.log("error", error);
    microApp.status = MicroAppStatus.ERROR;

    return microApp;
  }
}

export function unmountMicroApp(microApp: MicroApp) { 
  if (isMounted(microApp)) {
    const { provider, basename, name, rootNode, sandbox } = microApp;

    // @ts-ignore
    if (provider && provider.destroy) {
      // @ts-ignore
      provider.destroy({
        name,
        basename,
        dom: rootNode
      });
    }

    if (sandbox) {
      sandbox.reset();
    }
    microApp.rootNode = null;
    microApp.status = MicroAppStatus.UNMOUNT;
  }

  return microApp;
}

export async function loadMicroApp(microApp: MicroApp, basename?: string) {
  if (basename) {
    microApp = updateMicroApp(microApp, { basename });
  }

  try {
    microApp = updateMicroApp(microApp, { status: MicroAppStatus.LOADING });

    const { host } = microApp;
    const entry = await request(host);
    
    if (isHtml(entry.type)) {
      const doc = (new DOMParser())
        .parseFromString(entry.content.replace(/<!--.*?-->/g, ""), "text/html");
      
      const base = createElement("base");
      setAttribute(base, "href", host);
      doc.querySelector("head")!.appendChild(base);
      
      const { links, scripts } = handleAssets(doc, host);
      const assets = (await Promise.all([
        ...scripts,
        ...links
      ])).reduce((pre, cur) => {
        const key = cur.url;
        pre[key] = {
          url: cur.url,
          type: cur.type,
          content: cur.content
        };
        return pre
      }, {});
      microApp.assets = assets;
      
      removeElement(base);
      
      const htmlAST = await compileDocument(doc);
      microApp.htmlAST = htmlAST;
    } else if(isJavaScript(entry.type)) {
    } else {}

    const sandbox = createSandbox(microApp);

    microApp = updateMicroApp(microApp, { status: MicroAppStatus.LOADED, sandbox: sandbox });
  } catch (error) {
    microApp = updateMicroApp(microApp, { status: MicroAppStatus.ERROR });
  } finally {
    return microApp;
  }
}

export function registerMicroApp(microAppInfo: MicroAppInfo) {
  const obj: Record<PropertyKey, any> = {
    el: microAppInfo.el,
    name: microAppInfo.name,
    host: microAppInfo.host,
    activePath: microAppInfo.activePath,
    props: microAppInfo.props,
  }
  
  obj.status = MicroAppStatus.UNLOAD;
  obj.template = null;
  obj.cjsModule = {
    // exports: {},
  };
  obj.assets = {};
  obj.htmlAST = [];
  obj.customExports = {};
  obj.rootNode = null;
  obj.id = `${microAppInfo.name}_${Math.random().toString(36).substring(2, 8)}`;
  
  return Object.create(obj) as MicroApp;
}

export function isUnload(microApp: MicroApp) {
  return microApp.status === MicroAppStatus.UNLOAD
}

export function isError(microApp: MicroApp) {
  return microApp.status === MicroAppStatus.ERROR;
}

export function isLoaded(microApp: MicroApp) {
  return microApp.status === MicroAppStatus.LOADED;
}

export function isMounted(microApp: MicroApp) {
  return microApp.status === MicroAppStatus.MOUNTED;
}

export function isUnmount(microApp: MicroApp) {
  return microApp.status === MicroAppStatus.UNMOUNT;
}