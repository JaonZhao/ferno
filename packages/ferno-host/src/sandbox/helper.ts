import { __elementSandboxTag__, __proxyNode__, __sandboxMap__ } from "./symbolTypes";

// https://tc39.es/ecma262/#sec-function-properties-of-the-global-object
const esGlobalMethods =
  // Function properties of the global object // Function properties of the global object
  (
    'eval,isFinite,isNaN,parseFloat,parseInt,' +
    // URL handling functions
    'decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    // Constructor properties of the global object
    'Array,ArrayBuffer,BigInt,BigInt64Array,BigUint64Array,Boolean,DataView,Date,Error,EvalError,' +
    'FinalizationRegistry,Float32Array,Float64Array,Function,Int8Array,Int16Array,Int32Array,Map,Number,' +
    'Object,Promise,Proxy,RangeError,ReferenceError,RegExp,Set,SharedArrayBuffer,String,Symbol,SyntaxError,' +
    'TypeError,Uint8Array,Uint8ClampedArray,Uint16Array,Uint32Array,URIError,WeakMap,WeakRef,WeakSet,' +
    // Other Properties of the Global Object
    'Atomics,JSON,Math,Reflect,'
  ).split(',');
  export const optimizeMethods = [...esGlobalMethods].filter((v) => v !== 'eval');

const nativeCodeMethods = 'hasOwnProperty,'.split(',');

export const isEsGlobalMethods = makeMap(esGlobalMethods);
export const isNativeCodeMethods = makeMap(nativeCodeMethods);

const hasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwn(obj: any, key: PropertyKey): boolean {
  return hasOwnProperty.call(obj, key);
}

// Array to Object `['a'] => { a: true }`
export function makeMap<T extends Array<PropertyKey>>(list: T) {
  const map: { [k in T[number]]: true } = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return (val: PropertyKey) => !!map[val];
}

// Copy "window" and "document"
export function createFakeObject(
  target: Record<PropertyKey, any>,
  filter?: (key: PropertyKey) => boolean,
  isWritable?: (key: PropertyKey) => boolean,
) {
  const fakeObject = {};
  const propertyMap = {};
  const storageBox = Object.create(null); // Store changed value
  const propertyNames = Object.getOwnPropertyNames(target);
  const def = (p: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, p);
    if (descriptor?.configurable) {
      const hasGetter = hasOwn(descriptor, 'get');
      const hasSetter = hasOwn(descriptor, 'set');
      const canWritable = typeof isWritable === 'function' && isWritable(p);

      if (hasGetter) {
        // prettier-ignore
        descriptor.get = () => hasOwn(storageBox, p)
          ? storageBox[p]
          : target[p];
      }
      if (hasSetter) {
        descriptor.set = (val) => {
          storageBox[p] = val;
          return true;
        };
      }
      if (canWritable) {
        if (descriptor.writable === false) {
          descriptor.writable = true;
        } else if (hasSetter) {
          descriptor.set = (val) => {
            storageBox[p] = val;
            return true;
          };
        }
      }
      Object.defineProperty(fakeObject, p, Object.freeze(descriptor));
    }
  };
  propertyNames.forEach((p) => {
    propertyMap[p] = true;
    typeof filter === 'function' ? !filter(p) && def(p) : def(p);
  });
  // "prop" maybe in prototype chain
  for (const prop in target) {
    !propertyMap[prop] && def(prop);
  }
  return fakeObject as any;
}

export function isObject(val: any) {
  return val && typeof val === 'object';
}

export function handlerParams(args: IArguments | Array<any>) {
  args = Array.isArray(args) ? args : Array.from(args);
  return args.map((v) => {
    return v && v[__proxyNode__] ? v[__proxyNode__] : v;
  });
}

export function isPromise(obj: any): obj is Promise<any> {
  return isObject(obj) && typeof obj.then === 'function';
}

export function toWsProtocol(url: string) {
  const data = new URL(url);
  if (data.protocol.startsWith('http')) {
    data.protocol = data.protocol === 'https:' ? 'wss:' : 'ws:';
    return data.toString();
  }
  return url;
}

const objectToString = Object.prototype.toString;
export function getType(val: any) {
  return objectToString.call(val).slice(8, -1).toLowerCase();
}

// Reflect.set will be called in the set callback, and the DefineProperty callback will be triggered after Reflect.set is called.
// but the descriptor values ​​writable, enumerable, and configurable on safari 13.x version are set to false for the second time
// set and defineProperty callback is async Synchronize back
// Set the default when calling defineProperty through set ​​writable, enumerable, and configurable default to true
// safari 13.x default use strict mode，descriptor's ​​writable is false can't set again
// deal safari 13
export function safari13Deal() {
  let fromSetFlag = false;
  return {
    triggerSet() {
      fromSetFlag = true;
    },
    // reason: Reflect.set
    // Object.defineProperty is used to implement, so defineProperty is triggered when set is triggered
    // but the descriptor values ​​writable, enumerable, and configurable on safari 13.x version are set to false for the second time
    handleDescriptor(descriptor: PropertyDescriptor) {
      if (fromSetFlag === true) {
        fromSetFlag = false;
        if (descriptor?.writable === false) descriptor.writable = true;
        if (descriptor?.enumerable === false) descriptor.enumerable = true;
        if (descriptor?.configurable === false) descriptor.configurable = true;
      }
    },
  };
}

export function findTarget(
  el: Element | ShadowRoot | Document,
  selectors: Array<string>,
) {
  for (const s of selectors) {
    const target = el.querySelector(s);
    if (target) return target;
  }
  return el;
}

// // The sandbox may be used alone, to ensure that the `sandboxMap` is globally unique,
// // because we will only rewrite `appendChild` once
// let sandboxList = new Map();
// if (!(window)[__sandboxMap__]) {
//   (window)[__sandboxMap__] = sandboxList;
// } else {
//   sandboxList = window[__sandboxMap__];
// }

// export const sandboxMap = {
//   sandboxMap: sandboxList,
//   get(element) {
//     if (!element) return;
//     const sandboxId = element[__elementSandboxTag__];
//     if (typeof sandboxId !== 'number') return;
//     return this.sandboxMap.get(sandboxId);
//   },
//   setElementTag(element, sandbox: SandboxRuntime) {
//     if (!element) return;
//     element[__elementSandboxTag__] = sandbox.scope;
//   },
//   set(sandboxConfig: SandboxConfig) {
//     if (this.sandboxMap.get(sandboxConfig.scope)) return;
//     this.sandboxMap.set(sandboxConfig.scope, sandboxConfig);
//   },
//   del(sandboxConfig: SandboxConfig) {
//     this.sandboxMap.delete(sandboxConfig.scope);
//   },
// };

export function safeWrapper(
  callback: (...args: Array<any>) => any,
  disableWarn?: boolean,
) {
  try {
    callback();
  } catch (e) {
    
  }
}


interface LockItem {
  id: number;
  waiting: Promise<void>;
  resolve: (value?: any) => void;
}
/**
 * 1. generate lock queue by order
 * 2. lock queue will be released by order
 */
export class LockQueue {
  private id = 0;
  private lockQueue: LockItem[] = [];
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

export const __REMOVE_NODE__ = '__garfishremovenode__';