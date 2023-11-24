
type Opts = boolean | AddEventListenerOptions;
type Listener = EventListenerOrEventListenerObject;

const rawAddEventListener = window.addEventListener;
const rawRemoveEventListener = window.removeEventListener;

export function listenerModule() {
  const listeners = new Map<string, Listener[]>();
  
  function addListener(
    this: any,
    type: string,
    listener: Listener,
    options?: Opts,
  ) { 
    const curListeners = listeners.get(type) || [];
    listeners.set(type, [...curListeners, listener]);

    // This has been revised
    rawAddEventListener.call(
      this,
      type,
      listener,
      options,
    );
  }
  
  function removeListener(
    this: any,
    type: string,
    listener: Listener,
    options?: boolean | EventListenerOptions,
  ) {
    const curListeners = listeners.get(type) || [];
    const idx = curListeners.indexOf(listener);
    if (idx !== -1) {
      curListeners.splice(idx, 1);
    }
    listeners.set(type, [...curListeners]);
    rawRemoveEventListener.call(this, type, listener, options);
  }

  return {
    override: {
      addEventListener: addListener.bind(window),
      removeEventListener: removeListener.bind(window),
    },
    created: (global) => { 
      const fakeDocument = global?.document;
      if (fakeDocument) {
        fakeDocument.addEventListener = addListener.bind(document);
        fakeDocument.removeEventListener = removeListener.bind(document);
      }
    },
    recover: () => { 
      listeners.forEach((listener, key) => {
        listener.forEach((fn) => {
          rawRemoveEventListener.call(window, key, fn);
        });
      });
      listeners.clear();
    },
  };
}