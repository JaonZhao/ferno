
import { addModuleScope, fixUrl } from "./cssParser";
import { __REMOVE_NODE__, findTarget } from "./helper";
import { isCssType, isJsType } from "./mimeType";
import { __domWrapper__, __elementSandboxTag__, __sandboxMap__ } from "./symbolTypes";
import { isAbsolute, transformUrl } from "./url";
import { request } from "../loader";
import { createLinkCommonNode, createScriptCommentNode, removeElement } from "./dom";
import { SandboxRuntime } from ".";

interface LockItem {
  id: number;
  waiting: Promise<void>;
  resolve: (value?: any) => void;
}

interface Runtime {
  id: string;
  host: string;
  el: Element;
  execScript: (code: string, env: Record<PropertyKey, any>, url: string, options) => void;
  deferClearEffects: Set<any>;
  dynamicStyleSheetElementSet: Set<any>;
  styledComponentCSSRulesMap: WeakMap<HTMLStyleElement, any>;
}

const mountMethods = [
  "append",
  "appendChild",
  "insertBefore",
  "insertAdjacentElement",
];
const unmountMethods = [
  "removeChild"
];

const rawElementMethods = Object.create(null);

class LockQueue {
  private id = 0;
  private lockQueue: Array<LockItem> = [];
  private currentId = 0;

  genId() {
    const lockId = this.id;

    // This lock should wait for the other lock
    let promiseResolve: LockItem['resolve'] = () => {};
    const waiting = new Promise<void>((resolve) => {
      promiseResolve = resolve;
      this.currentId++;
    });
    // create a new lock
    const lockItem = {
      id: lockId,
      waiting,
      resolve: () => {
        promiseResolve();
      },
    };
    this.lockQueue.push(lockItem);
    this.id += 1;
    return lockId;
  }

  getId() {
    return this.id;
  }

  async wait(id: number) {
    const { lockQueue } = this;
    const firstLock = lockQueue[0];

    // This lock is processing, just return and remove immediately

    // This lock should wait for the other lock
    const lockItem = lockQueue.find((item) => item.id === id);
    const lockIndex = lockQueue.findIndex((item) => item.id === id);

    if (firstLock.id === id) {
      lockItem?.resolve();
      return;
    }

    if (lockItem) {
      // start waiting
      await Promise.all(
        lockQueue.slice(0, lockIndex).map((item) => item.waiting),
      );
      const lastLock = lockQueue[lockQueue.length - 1];
      // 最后一个结束后清除列表
      if (lastLock.id === id) {
        this.clear();
      }
    }
  }

  release(id: number) {
    const { lockQueue } = this;

    const lockItem = lockQueue.find((item) => item.id === id);
    lockItem?.resolve();
  }

  clear() {
    this.lockQueue = [];
  }
}

let sandboxList = new Map();
if (!window[__sandboxMap__]) {
  window[__sandboxMap__] = sandboxList;
} else {
  sandboxList = window[__sandboxMap__];
}
export const sandboxMap = {
  mark: (el: Element, runtime: SandboxRuntime) => { 
    if (!el) {
      return;
    }
    el[__elementSandboxTag__] = runtime.id;
  },
  get: (el: Element) => { 
    if (!el) {
      return;
    }
    const id = el[__elementSandboxTag__];
    return sandboxList.get(id);
  },
  set: (runtime: SandboxRuntime) => { 
    if (sandboxList.get(runtime.id)) {
      return;
    }
    sandboxList.set(runtime.id, runtime);
  },
  delete: (runtime: SandboxRuntime) => { 
    sandboxList.delete(runtime.id);
  },
};

const sourceListTags = [
  "link",
  "style",
  "script",
  "img",
  "video",
  "audio",
  "iframe"
];

function fixResourceNodeUrl(element: Element, baseUrl: string) {
  const src = element.getAttribute("src");
  const href = element.getAttribute("href");
  if (src) {
    element.setAttribute("src", transformUrl(baseUrl, src));
  } else if (href) {
    element.setAttribute("href", transformUrl(baseUrl, href));
  }
}


function findParentElementInSandbox(container: Element, parentElement: Element, defaultInsert?: string) {
  if (parentElement === document.body) {
    return findTarget(container, [
      "body",
      "div[__phenixin_body__]"
    ])
  } else if (parentElement === document.head) {
    return findTarget(container, [
      "head",
      "div[__phenixin_head__]"
    ]);
  }

  if (
    container.contains(parentElement) ||
    !document.contains(parentElement)
  ) {
    return parentElement;
  }

  if (defaultInsert === "head") {
    return findTarget(container, [
      "head",
      "div[__phenixin_head__]"
    ]);
  } else if (defaultInsert === "body") {
    return findTarget(container, [
      "body",
      "div[__phenixin_body__]"
    ])
  }

  return parentElement;
}

function dispatchEvent(element: Element, type: string, errInfo?: ErrorEventInit) {
  Promise
    .resolve()
    .then(() => {
      const isError = type === 'error';
      let event;
      if (isError && errInfo) {
        event = new ErrorEvent(type, {
          ...errInfo,
          message: errInfo.error?.message,
        });
      } else {
        event = new Event(type);
      }
      event.__byGarfish__ = true;
      Object.defineProperty(event, 'target', { value: element });
      element.dispatchEvent(event);
      isError && window.dispatchEvent(event);
    });
}

function createDynamicScript(element: HTMLScriptElement, runtime: Runtime) {
  const src = element.src;
  const type = element.type;
  const isModule = type === "module"
  const code = element.textContent || element.text || "";

  if (!type || isJsType({ src, type })) {
    const host = runtime.host;
    if (src) {
      const url = isAbsolute(src)
        ? src
        : transformUrl(host, src);
      request(url)
        .then((res) => {
          // TODO: 需要加类型判断
          const content = res.content;
          runtime.execScript(content, {}, url, {
            isModule,
            defer: false,
            async: false,
            noEntry: true,
            originScript: element
          });
          dispatchEvent(element, "load");
        })
        .catch(e => {
          dispatchEvent(element, "error", {
            error: e,
            filename: url
          });
        });
    } else if(code) {
      runtime.execScript(code, {}, host, {});
    }

    const scriptCommentNode = createScriptCommentNode(element as HTMLScriptElement);

    element[__REMOVE_NODE__] = () => { 
      removeElement(scriptCommentNode);
      return scriptCommentNode;
    };
  }

  return element;
}

function addDynamicLink(
  element: Element,
  runtime: Runtime,
  linkLock: LockQueue,
  next: (style: HTMLStyleElement) => void
) {
  const href = element.getAttribute("href") as string;
  const type = element.getAttribute("type");
  if (!type || isCssType({ src: href, type })) {
    if (href) {
      const host = runtime.host;
      const url = isAbsolute(href)
        ? href
        : transformUrl(host, href);
      const lockId = linkLock.genId();
      request(url)
        .then((res) => {
          linkLock.wait(lockId);

          const content = addModuleScope(fixUrl(res.content, url));
          const style = document.createElement('style');
          style.setAttribute('type', 'text/css');
          style.textContent = content;
          next(style);
          dispatchEvent(element, "load");

          linkLock.release(lockId);
        })
        .catch(e => {
          linkLock.release(lockId);
          dispatchEvent(element, "error",{
            error: e,
            filename: url,
          });
        });
    }
  }

  const linkCommentNode = createLinkCommonNode(element as HTMLLinkElement);
  element[__REMOVE_NODE__] = () => {
    removeElement(linkCommentNode);
  }
  return linkCommentNode;
}

function listenChangesOfLink(
  link: HTMLLinkElement,
  linkLock: LockQueue,
  runtime: Runtime
) {
  if (link["modifyFlag"]) {
    return;
  }

  const mutator = new MutationObserver((mutations) => { 
    if (link["modifyFlag"]) {
      return;
    }

    for (const { type, attributeName } of mutations) {
      if (
        type === "attributes" &&
        (attributeName === "rel" || attributeName === "stylesheet")
      ) {
        if (link["modifyFlag"]) {
          return;
        }
        if (link.rel === "stylesheet" && link.href) {
          link.disabled = link["modifyFlag"] = true;
          const commentNode = addDynamicLink(
            link,
            runtime,
            linkLock,
            (style) => {
              commentNode.parentElement?.replaceChild(style, commentNode)
            });
          link.parentNode?.replaceChild(commentNode, link);
        }
      }
    }
  });

  mutator.observe(link, { attributes: true });
}

function listenChnageOfStyle(
  style: HTMLStyleElement,
  runtime: Runtime,
) {
  const { host } = runtime;
  const modifyStyleCode = (text: string | null) => {
    if (!text) {
      return null;
    }
    return addModuleScope(fixUrl(text, host));
  }
  const createFakeSheet = (
    styleTransformeFn: (text: string | null) => string | null
  ) => {
    const rulesData: Array<string> = [];
    const getRealSheet = () => Reflect.get(HTMLStyleElement.prototype, "sheet", style);
    runtime.styledComponentCSSRulesMap.set(style, rulesData);

    const fakeSheet = {
      get cssRules() { 
        return getRealSheet() ?? [];
      },
      insertRule: (rule: string, index?: number) => { 
        const realSheet = getRealSheet();
        const text = styleTransformeFn(rule) || "";
        if (realSheet) {
          realSheet.insertRule(text, index);
        }
        rulesData.splice(index || 0, 0, text);
        return index || 0;
      },
      deleteRule: (index: number) => { 
        const realSheet = getRealSheet();
        if (realSheet) {
          realSheet.deleteRule(index);
        }
        rulesData.splice(index, 1);
      }
    };

    return fakeSheet;
  }

  const mutator = new MutationObserver((mutations) => {
    for (const { type, addedNodes } of mutations) {
      if (addedNodes.length > 0 && addedNodes[0].textContent) {
        if (type === "childList") {
          addedNodes[0].textContent = modifyStyleCode(addedNodes[0].textContent); 
        }
      }
    }
  });
  mutator.observe(style, { childList: true });

  let fakeSheet: any = null;
  Reflect.defineProperty(style, "sheet", {
    get: () => {
      if (!fakeSheet) {
        fakeSheet = createFakeSheet(modifyStyleCode);
      }
      return fakeSheet;
    },
    configurable: true,
  });
}

function unmountElement(props: {
  context: Element;
  el: Element;
  runtime: Runtime;
  originProcess: () => void;
}) {
  const { 
    context,
    el,
    runtime,
    originProcess
  } = props;

  if (typeof el[__REMOVE_NODE__] === "function") {
    el[__REMOVE_NODE__]();
    return el;
  }

  const rootNode = runtime.el;
  const tagName = el.tagName;
  switch (tagName) {
    case "style": 
    case "link":
    case "script": { 
      const parentNode = findParentElementInSandbox(
        rootNode,
        context,
        tagName === "script" ? "body" : "head",
      );
      if (el.parentNode === parentNode) {
        if (runtime.dynamicStyleSheetElementSet.has(el)) {
          runtime.dynamicStyleSheetElementSet.delete(el);
        }
        return rawElementMethods['removeChild'].call(parentNode, el);
      }
    } break;
    default: break;
  }

  return originProcess();
}

function mountElement(props: {
  methodName: string;
  context: Element;
  el: Element,
  args: IArguments;
  runtime: Runtime;
  originProcess: () => void;
}) {
  const { 
    methodName,
    context,
    el,
    args,
    runtime,
    originProcess,
  } = props;
  const rootElement = runtime.el;
  const tagName = el.tagName
    ? el.tagName.toLowerCase()
    : "";
  const linkLock = new LockQueue();

  if (sourceListTags.includes(tagName)) {
    fixResourceNodeUrl(el, runtime.host);
  }

  let convertedElement;
  let parentElement;
  switch (tagName) {
    case "script": {
      parentElement = findParentElementInSandbox(rootElement, context, "body");
      convertedElement = createDynamicScript(el as HTMLScriptElement, runtime);
    } break;
    case "style": {
      parentElement = findParentElementInSandbox(rootElement, context, "head");
      el.textContent = addModuleScope(fixUrl(el.textContent || "", runtime.host));
      convertedElement = el;
      runtime.dynamicStyleSheetElementSet.add(el);
      listenChnageOfStyle(el as HTMLStyleElement, runtime);
    } break;
    case "link": {
      parentElement = findParentElementInSandbox(rootElement, context, "head");
      const rel = el.getAttribute("rel");
      const href = el.getAttribute("href");
      if (rel === "stylesheet" && href) {
        convertedElement = addDynamicLink(
          el,
          runtime,
          linkLock,
          (style) => { 
            rawElementMethods["appendChild"].call(parentElement, style);
          }
        );
      } else {
        convertedElement = el;
        listenChangesOfLink(
          el as HTMLLinkElement,
          linkLock,
          runtime,
        );
      }

    } break;
    default: break;
  }

  if (
    !rootElement.contains(parentElement) &&
    document.contains(parentElement)
  ) {
    if (parentElement !== rootElement) {
      runtime.deferClearEffects.add(() => { 
        removeElement(el);
        return el;
      });
    }
  }

  if (el && el.querySelectorAll) {
    const needFixDom = el.querySelectorAll(
      "iframe,img,video,link,script,audio,style",
    );
    if (needFixDom.length > 0) {
      needFixDom.forEach((dom) => {
        fixResourceNodeUrl(dom, runtime.host);
      })
    }
  }

  if (convertedElement) {
    if (
      (methodName === "insertBefore" || methodName === "insertAdjacentElement") &&
      rootElement.contains(context) &&
      args[1].parentNode === context
    ) {
      return originProcess();
    }

    return rawElementMethods['appendChild'].call(parentElement, convertedElement);
  }

  return originProcess();
}

function unmountInjector(fn: Function, methodName: string) { 
  return function (this: Element) {
    const el = arguments[0];
    const originProcess = () => fn.apply(this, arguments);
    const runtime = el && sandboxMap.get(el);
    if (!runtime) {
      return originProcess();
    }

    unmountElement({
      context: this,
      el,
      runtime,
      originProcess
    })
  }
}

function mountInjector(fn: Function, methodName: string) { 
  // TODO: 这个用法了解下
  return function (this: Element) {
    const el = methodName === "insertAdjacentElement"
      ? arguments[1]
      : arguments[0];
    const originProcess = () => fn.apply(this, arguments);

    const runtime = el && sandboxMap.get(el);
    if (!runtime) {
      return originProcess();
    }

    if (el && this.tagName.toLowerCase() === "style") {
      const host = runtime.host;
      const textContent = addModuleScope(fixUrl(this.textContent || "", host));
      this.textContent = textContent;
      return originProcess();
    } else {
      mountElement({
        methodName,
        context: this,
        el,
        args: arguments,
        runtime,
        originProcess
      });
    }
  }
}


let hasInject = false;
export function makeElementInjector(window: Window & typeof globalThis) {
  if (hasInject) {
    return;
  }

  if (typeof window.Element === 'function') {
    const makeInjector = (methods: Array<string>, injector: typeof mountInjector | typeof unmountInjector) => {
      for (const name of methods) {
        const fn = window.Element.prototype[name];
        if (typeof fn !== "function" || fn[__domWrapper__]) {
          continue;
        }

        rawElementMethods[name] = fn;
        const wrapper = injector(fn, name);
        wrapper[__domWrapper__] = true;
        window.Element.prototype[name] = wrapper;
      }
    }
    
    makeInjector(mountMethods, mountInjector);
    makeInjector(unmountMethods, unmountInjector);
  }

  hasInject = true;
}

export function rebuildCSSRules(
  dynamicStyleSheetElementSet: Set<HTMLStyleElement>,
  styledComponentCSSRulesMap: WeakMap<HTMLStyleElement, any>,
) {
  dynamicStyleSheetElementSet.forEach((styleElement) => {
    const rules = styledComponentCSSRulesMap.get(styleElement);
    if (rules && (rules.length || styleElement instanceof HTMLStyleElement && !styleElement.textContent)) {
      const realSheet = Reflect.get(
        HTMLStyleElement.prototype,
        'sheet',
        styleElement,
      );
      if (realSheet) {
        for (let i = 0; i < rules.length; i++) {
          const cssRule = rules[i];
          // re-insert rules for styled-components element
          // use realSheet to skip transforming
          realSheet.insertRule(cssRule, i);
        }
      }
    }
  });
}