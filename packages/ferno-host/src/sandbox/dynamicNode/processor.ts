import { SandboxConfig } from "..";
import { transformUrl } from "../compiler/utils";
import { LockQueue, __REMOVE_NODE__, findTarget, makeMap, safeWrapper } from "../helper";

const isInsertMethod = makeMap(['insertBefore', 'insertAdjacentElement']);
export const sourceListTags = [
  'link',
  'style',
  'script',
  'img',
  'video',
  'audio',
  'iframe',
];

export const rawElementMethods = Object.create(null);

export class DynamicNodeProcessor {
  private el: any;
  private tagName: string;
  private methodName: string;
  private sandboxConfig: SandboxConfig;
  private rootElement: Element | ShadowRoot | Document;
    private nativeAppend = rawElementMethods['appendChild'];
  private nativeRemove = rawElementMethods['removeChild'];

  static linkLock: LockQueue = new LockQueue();

  constructor(el, sandboxConfig, methodName) {
    this.el = el;
    this.sandboxConfig = sandboxConfig;
    this.rootElement = sandboxConfig.el;
    this.tagName = el.tagName ? el.tagName.toLowerCase() : '';
  }

  private is(tag: string) {
    return this.tagName === tag;
  }

  private fixResourceNodeUrl(el: any) {
    const baseUrl = this.sandboxConfig.host;
    if (baseUrl) {
      const src = el.getAttribute('src');
      const href = el.getAttribute('href');
      
      src && (el.src = transformUrl(baseUrl, src));
      href && (el.href = transformUrl(baseUrl, href));
    }
  }

  private findParentNodeInApp(parentNode: Element, defaultInsert?: string) {
    if (parentNode === document.body) {
      return findTarget(this.rootElement, [
        'body',
        `div[__phenixin_body__]`,
      ]) as Element;
    } else if (parentNode === document.head) {
      return findTarget(this.rootElement, [
        'head',
        `div[__phenixin_head__]`,
      ]) as Element;
    }

    // Add the location of the destination node is not a container to the container of the application
    // Has not been added to the container, or cannot be searched through document in shadow dom
    if (
      this.rootElement.contains(parentNode) ||
      !document.contains(parentNode)
    ) {
      return parentNode;
    }

    if (defaultInsert === 'head') {
      return findTarget(this.rootElement, [
        'head',
        `div[__phenixin_head__]`,
      ]) as Element;
    } else if (defaultInsert === 'body') {
      return findTarget(this.rootElement, [
        'body',
        `div[__phenixin_body__]`,
      ]) as Element;
    }
    return parentNode;
  }
  
  // Load dynamic js script
  private addDynamicScriptNode() {
    const { src, type, crossOrigin } = this.el;
    const isModule = type === 'module';
    const code = this.el.textContent || this.el.text || '';

    if (!type || isJsType({ src, type })) {
      // The "src" higher priority
      const { baseUrl, namespace } = this.sandbox.options;
      if (src) {
        const fetchUrl = baseUrl ? transformUrl(baseUrl, src) : src;
        this.sandbox.loader
          .load<JavaScriptManager>({
            scope: namespace,
            url: fetchUrl,
            crossOrigin,
            defaultContentType: type,
          })
          .then(
            (manager) => {
              if (manager.resourceManager) {
                const {
                  resourceManager: { url, scriptCode },
                } = manager;
                // It is necessary to ensure that the code execution error cannot trigger the `el.onerror` event
                this.sandbox.execScript(scriptCode, {}, url, {
                  isModule,
                  defer: false,
                  async: false,
                  noEntry: true,
                  originScript: this.el,
                });
              } else {
                warn(
                  `Invalid resource type "${type}", "${src}" can't generate scriptManager`,
                );
              }
              this.dispatchEvent('load');
            },
            (e) => {
              __DEV__ && warn(e);
              this.dispatchEvent('error', {
                error: e,
                filename: fetchUrl,
              });
            },
          );
      } else if (code) {
        this.sandbox.execScript(code, {}, baseUrl, {
          noEntry: true,
          originScript: this.el,
        });
      }
      // To ensure the processing node to normal has been removed
      const scriptCommentNode = this.DOMApis.createScriptCommentNode({
        src,
        code,
      });
      this.el[__REMOVE_NODE__] = () =>
        this.DOMApis.removeElement(scriptCommentNode);
      return scriptCommentNode;
    }

    return this.el;
  }

  append(context: Element, args: IArguments, originProcess: Function) {
    let convertedNode;
    let parentNode = context;
    const { host } = this.sandboxConfig;

    if (sourceListTags.includes(this.tagName)) {
      this.fixResourceNodeUrl(this.el);
    }

    if (this.is("script")) {
      parentNode = this.findParentNodeInApp(context, 'body');
      convertedNode = this.addDynamicScriptNode();
    } else if (this.is("style")) {
      
    } else if (this.is('link')) {
      
    }

    if (
      !this.rootElement.contains(parentNode) &&
      document.contains(parentNode)
    ) {
      if (parentNode !== this.rootElement) {
        
      }
    }

    if (this.el && this.el.querySelectorAll) {
      const needFixDom = this.el.querySelectorAll(
        'iframe,img,video,link,script,audio,style',
      );
      if (needFixDom.length > 0) {
        needFixDom.forEach((dom) => {
          safeWrapper(() => this.fixResourceNodeUrl(dom));
        });
      }
    }

    if (convertedNode) {
      if (
        isInsertMethod(this.methodName) &&
        this.rootElement.contains(context) &&
        args[1]?.parentNode === context
      ) {
        return originProcess();
      }
    }

    return originProcess();
  } 

  removeChild(context: Element, originProcess: Function) {
    // remove comment node and return the real node
    if (typeof this.el[__REMOVE_NODE__] === 'function') {
      this.el[__REMOVE_NODE__]();
      return this.el;
    }

    if (this.is('style') || this.is('link') || this.is('script')) {
      const parentNode = this.findParentNodeInApp(
        context,
        this.is('script') ? 'body' : 'head',
      );

      // if (this.el.parentNode === parentNode) {
      //   if (this.sandbox.dynamicStyleSheetElementSet.has(this.el)) {
      //     this.sandbox.dynamicStyleSheetElementSet.delete(this.el);
      //   }
      //   return this.nativeRemove.call(parentNode, this.el);
      // }
    }

    return originProcess();
  }
}