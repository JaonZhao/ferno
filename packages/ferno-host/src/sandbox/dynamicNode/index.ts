import { safeWrapper, sandboxMap } from "../helper";
import { SandboxConfig } from "../index";
import { __domWrapper__ } from "../symbolTypes";
import { injectHandlerParams } from "./processParams";
import { rawElementMethods } from "./processor";

const mountElementMethods = [
  'append',
  'appendChild',
  'insertBefore',
  'insertAdjacentElement',
];
const removeChildElementMethods = ['removeChild'];

// Handle `ownerDocument` to prevent elements created by `ownerDocument.createElement` from escaping
function handleOwnerDocument() {
  Object.defineProperty(window.Element.prototype, 'ownerDocument', {
    get() {
      const sandbox = this && sandboxMap.get(this);
      const realValue = Reflect.get(
        window.Node.prototype,
        'ownerDocument',
        this,
      );
      return sandbox ? sandbox.global.document : realValue;
    },
    set() {},
  });
}

function injector(current: Function, methodName: string) {
  return function (this: Element) {
    const el = methodName === 'insertAdjacentElement'
      ? arguments[1]
      : arguments[0];
    const sandbox = sandboxMap.get(el);
    const originProcess = () => current.apply(this, arguments); 

    if (sandbox) {
      if (el && this.tagName.toLowerCase() === "style") {
        
        return originProcess();
      } else {
        
      }
    } else {
      return originProcess();
    }
  }
}

function injectorRemoveChild(current: Function, methodName: string) {
  return function (this: Element) {
    const el = arguments[0];
    const sandbox = el && sandboxMap.get(el);
    const originProcess = () => {
      // Sandbox may have applied sub dom side effects to delete
      // by removeChild deleted by the tag determine whether have been removed
      return current.apply(this, arguments);
    };

    if (sandbox) {
      
    }
    return originProcess();
  }
}

export function makeElInjector(sandboxConfig: SandboxConfig) {
  if ((makeElInjector as any).hasInject) return;
  (makeElInjector as any).hasInject = true;

  if (typeof window.Element === "function") {
    safeWrapper(() => handleOwnerDocument());
    const rewrite = (methods: Array<string>, builder) => { 
      for (const name of methods) {
        const fn = window.Element.prototype[name];
        if (typeof fn !== "function" || fn[__domWrapper__]) {
          continue;
        }
        
        rawElementMethods[name] = fn;
        const wrapper = builder(fn, name);
        wrapper[__domWrapper__] = true;
        window.Element.prototype[name] = wrapper;
      }
    };

    rewrite(mountElementMethods, injector);
    rewrite(removeChildElementMethods, injectorRemoveChild);
  }

  injectHandlerParams();
}