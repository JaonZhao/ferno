import { 
  isPromise,
  hasOwn,
  toWsProtocol,
} from "../helper";
import {
  isAbsoluteUrl,
  transformUrl
} from "../../utils/path";
import { SandboxRuntime } from "..";

export function networkModule(sandboxRuntime: SandboxRuntime) {
  const baseUrl = sandboxRuntime.host;
  const wsSet = new Set<fakeWebSocket>();
  const xhrSet = new Set<fakeXMLHttpRequest>();
  const fetchSet = new Set<AbortController>();
  const needFix = (url) => baseUrl &&
    typeof url === 'string' &&
    !isAbsoluteUrl(url);
  class fakeXMLHttpRequest extends XMLHttpRequest {
    constructor() {
      super();
      xhrSet.add(this);
    }

    open() {
      // sync request
      if (arguments[2] === false) {
        xhrSet.delete(this);
      }
      if (needFix(arguments[1])) {
        arguments[1] = baseUrl
          ? transformUrl(baseUrl, arguments[1])
          : arguments[1];
      }

      const url = arguments[1];
      return super.open.apply(this, arguments);
    }

    abort() {
      xhrSet.delete(this);
      return super.abort.apply(this, arguments);
    }
  }

  class fakeWebSocket extends WebSocket {
    constructor(url, protocols?: string | string[]) {
      if (needFix(url) && baseUrl) {
        const baseWsUrl = toWsProtocol(baseUrl);
        url = transformUrl(baseWsUrl, arguments[1]);
      }
      super(url, protocols);
      wsSet.add(this);
    }

    close() {
      wsSet.delete(this);
      return super.close.apply(this, arguments);
    }
  }

  // `fetch` is not constructor
  const fakeFetch = (input, options: RequestInit = {}) => {
    if (needFix(input) && baseUrl) {
      input = transformUrl(baseUrl, input);
    }

    let controller;
    if (!hasOwn(options, 'signal') && window.AbortController) {
      controller = new window.AbortController();
      options.signal = controller.signal;
    }
    const result = window.fetch(input, options);
    return controller && isPromise(result)
      ? result.finally(() => fetchSet.delete(controller))
      : result;
  };


  return {
    override: {
      WebSocket: fakeWebSocket as any,
      XMLHttpRequest: fakeXMLHttpRequest as any,
      fetch: fakeFetch,
    },

    recover: () => {
      wsSet.forEach((ws) => {
        if (typeof ws.close === 'function') ws.close();
      });
      xhrSet.forEach((xhr) => {
        if (typeof xhr.abort === 'function') xhr.abort();
      });
      fetchSet.forEach((ctor) => {
        if (typeof ctor.abort === 'function') ctor.abort();
      });

      wsSet.clear();
      xhrSet.clear();
      fetchSet.clear();
    },
  }
}