import { SandboxConfig, SandboxRuntime } from "..";
import { findTarget, hasOwn, isObject, makeMap, safari13Deal } from "../helper";
import { sandboxMap } from "../injector";
import { __documentBind__ } from "../symbolTypes";
import { bind, verifyGetterDescriptor } from "./shared";

const passedKey = makeMap(['title', 'cookie', 'onselectstart', 'ondragstart']);
const queryFunctions = makeMap([
  'querySelector',
  'querySelectorAll',
  'getElementById',
  'getElementsByTagName',
  'getElementsByTagNameNS',
  'getElementsByClassName',
]);
const safariProxyDocumentDealHandler = safari13Deal();

export function createGetter(sandboxRuntime: SandboxRuntime) { 
  return (target: object, p: string | symbol, receiver?: any) => {
    const root = sandboxRuntime.el;
    const value = hasOwn(target, p)
      ? Reflect.get(target, p, receiver)
      : Reflect.get(document, p);
    
    const setSandboxRef = (el) => {
      if (isObject(el)) {
        sandboxMap.mark(el, sandboxRuntime);
      }
      return el;
    };

    if (root) {
      if (p === "createElement") {
        return function (tagName, options) {
          const el = value.call(document, tagName, options);
          return setSandboxRef(el);
        }
      } else if (p === "createTextNode") {
        return function (data) {
          const el = value.call(document, data);
          return setSandboxRef(el);
        }
      } else if (p === "head") {
        return findTarget(root, ['head', `div[__phenixin_head__]`]) || value;
      } else if (p === "body") {
        return findTarget(root, ["body", `div[__phenixin_body__]`]);
      } else if (queryFunctions(p)) {
        return p === "getElementById"
          ? (id) => root.querySelector(`#${id}`)
          : root[p].bind(root);
      }
    }
    
    if (typeof value === "function") {
      let newValue = hasOwn(value, __documentBind__)
        ? value[__documentBind__]
        : null;
      if (!newValue) newValue = bind(value, document);
      
      const verifyResult = verifyGetterDescriptor(target, p, newValue);
      if (verifyResult > 0) {
        if (verifyResult === 1) return value;
        if (verifyResult === 2) return undefined;
      }
      value[__documentBind__] = newValue;
      return newValue;
    }
    
    return value;
  }
}

export function createSetter(sandboxRuntime: SandboxRuntime) { 
  return (target: object, p: string | symbol, value: any, receiver?: any) => {
    const root = sandboxRuntime.el;
    const verifyResult = verifyGetterDescriptor(
      typeof p === 'string' && passedKey(p)
        ? document
        : (receiver || target),
      p,
      value,
    ); 
    if (verifyResult > 0) {
      if (verifyResult === 1 || verifyResult === 2) return false;
      if (verifyResult === 3) return true;
    }

    if (p === "onselectstart" || p === "ondragstart") {
      if (root) {
        return Reflect.set(root, p, value);
      } else {
        return Reflect.set(document, p, value);
      }
    }

    if (typeof p === "string" && passedKey(p)) {
      return Reflect.set(document, p, value);
    } else {
      safariProxyDocumentDealHandler.triggerSet();
      return Reflect.set(target, p, value, receiver);
    }
  };
}

export function createDefineProperty() {
  return (target: object, p: string | symbol, desc: PropertyDescriptor) => {
    safariProxyDocumentDealHandler.handleDescriptor(desc);
    return passedKey(p)
      ? Reflect.defineProperty(document, p, desc)
      : Reflect.defineProperty(target, p, desc);
  }
}


export function createHas() {
  return (target: object, p: string | symbol) => {
    if (p === "activeElement") {
      return Reflect.has(document, p);
    }
    return hasOwn(target, p) || Reflect.has(document, p);
  }
}