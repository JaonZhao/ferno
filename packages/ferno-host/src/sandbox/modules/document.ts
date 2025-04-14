import { 
  createGetter,
  createSetter,
  createDefineProperty,
  createHas
} from "../proxyInterceptor/document";
import { createFakeObject } from "../helper";
import { __proxyNode__ } from "../symbolTypes";

import { SandboxRuntime } from "../index";

export function documentModule(sandboxRuntime: SandboxRuntime) {
  let proxyDocument = Object.create(document);
  const fakeDocument = createFakeObject(document);
  const getter = createGetter(sandboxRuntime);
  const fakeDocumentProto = new Proxy(fakeDocument, {
    get: (...args) => {
      return getter(...args);
    },
    has: createHas()
  });

  proxyDocument = new Proxy(
    Object.create(fakeDocumentProto, {
      currentScript: {
        value: null,
        writable: true,
      },
      [__proxyNode__]: {
        writable: false,
        configurable: false,
        value: document,
      }
    }),
    {
      set: createSetter(sandboxRuntime),
      defineProperty: createDefineProperty(),
      getPrototypeOf: () => HTMLDocument.prototype || Document.prototype
    }
  );
  
  return {
    override: {
      document: proxyDocument
    }
  };
}