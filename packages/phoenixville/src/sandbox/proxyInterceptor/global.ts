import {
  __windowBind__,
  GARFISH_OPTIMIZE_NAME
} from '../symbolTypes';
import { 
  bind,
  isConstructor,
  verifyGetterDescriptor,
  verifySetterDescriptor,
} from "./shared";
import {
  hasOwn,
  isEsGlobalMethods,
  isNativeCodeMethods,
  safari13Deal
} from "../helper";
import { ReplaceGlobalVariables } from '..';

const safariProxyWindowDealHandler = safari13Deal();

// window proxy getter
export function createGetter(replaceGlobalVariables: ReplaceGlobalVariables) {
  return (target: Window, p: PropertyKey, receiver: any) => {
    if (p === Symbol.unscopables) return undefined;
    const { overrideList } = replaceGlobalVariables;
    const value = hasOwn(target, p)
        ? Reflect.get(target, p, receiver)
        : Reflect.get(window, p);

    if (typeof value === 'function') {
      // The following situations do not require "bind"
      //  1. The global method on the native es standard
      //  2. Methods internal to the sandbox or rewritten by the user
      //  3. Constructor
      // After filtering out custom and native es functions, only bom and dom functions are left
      // Make judgments such as constructors for these environment-related functions to further narrow the scope of bind
      if (
        isEsGlobalMethods(p) ||
        isNativeCodeMethods(p) ||
        hasOwn(overrideList, p) ||
        isConstructor(value)
      ) {
        return value;
      }
    } else {
      return value;
    }

    const newValue = hasOwn(value, __windowBind__)
      ? value[__windowBind__]
      : bind(value, window);
    const verifyResult = verifyGetterDescriptor(target, p, newValue);
    if (verifyResult > 0) {
      if (verifyResult === 1) return value;
      if (verifyResult === 2) return undefined;
    }
    value[__windowBind__] = newValue;
    return newValue;
  };
}

// window proxy setter
export function createSetter() {
  return (target: Window, p: PropertyKey, value: unknown, receiver: any) => {
    const verifyResult = verifySetterDescriptor(
      // prettier-ignore
      receiver
          ? receiver
          : target,
      p,
      value,
    );
    // If the value is the same, the setting success will be returned directly. Cannot be set and return to failure directly.
    // "Reflect.set" does not perform this part of processing by default in safari
    if (verifyResult > 0) {
      if (verifyResult === 1 || verifyResult === 2) return false;
      if (verifyResult === 3) return true;
    }

    // current is setting
    safariProxyWindowDealHandler.triggerSet();
    const success = Reflect.set(target, p, value, receiver);
    // if (success) {
    //   if (sandbox.initComplete) {
    //     sandbox.isExternalGlobalVariable.add(p);
    //   }

    //   // Update need optimization variables
    //   if (sandbox.global) {
    //     const methods = sandbox.global[`${GARFISH_OPTIMIZE_NAME}Methods`];
    //     if (Array.isArray(methods)) {
    //       if (methods.includes(p)) {
    //         const updateStack =
    //           sandbox.global[`${GARFISH_OPTIMIZE_NAME}UpdateStack`];
    //         updateStack.forEach((fn) => fn(p, value));
    //       }
    //     }
    //   }
    // }

    return success;
  };
}

// window proxy deleteProperty
export function createDefineProperty() {
  return (target: Window, p: PropertyKey, descriptor: PropertyDescriptor) => { 
    const success = Reflect.defineProperty(target, p, descriptor);
    return success;
  };
}

// window proxy deleteProperty
export function createDeleteProperty() { 
  return (target: Window, p: PropertyKey) => { 
    if (hasOwn(target, p)) {
      delete target[p];
    }
    return true;
  };
}

export function createHas() {
  return (target: Window, p: PropertyKey) => { 
    return true;
  };
}