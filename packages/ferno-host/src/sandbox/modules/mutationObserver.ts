
export function observerModule() { 
  const observerSet = new Set<MutationObserver>();

  class ProxyMutationObserver extends MutationObserver {
    constructor(cb: MutationCallback) {
      super(cb);
      observerSet.add(this);
    }
  }

  return {
    override: {
      MutationObserver: ProxyMutationObserver as Function,
    },
    recover: () => { 
      observerSet.forEach((observer) => {
        if (typeof observer.disconnect === 'function') observer.disconnect();
      });
      observerSet.clear();
    },
  };
}