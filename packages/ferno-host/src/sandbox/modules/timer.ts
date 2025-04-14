
const originalSetTimeout = window.setTimeout;
const originalClearTimeout = window.clearTimeout;
const originalSetInterval = window.setInterval;
const originalClearInterval = window.clearInterval;

export function timeoutModule() {
  const timeout = new Set<number>();

  const setTimeout = (handler: TimerHandler, ms?: number, ...args: any[]) => { 
    const timeoutId = originalSetTimeout(handler, ms, ...args);
    timeout.add(timeoutId);
    return timeoutId;
  };
  const clearTimeout = (timeoutId: number) => { 
    timeout.delete(timeoutId);
    originalClearTimeout(timeoutId);
  };

  return {
    recover: () => { 
      timeout.forEach(timeoutId => {
        originalClearTimeout(timeoutId);
      });
    },
    override: {
      setTimeout,
      clearTimeout
    },
  };
}

export function intervalModule() { 
  const timeout = new Set<number>();

  const setInterval = (
    callback: (...args: any[]) => void,
    ms: number,
    ...args: any[]
  ) => { 
    const intervalId = originalSetInterval(callback, ms, ...args);
    timeout.add(intervalId);
    return intervalId;
  };
  const clearInterval = (intervalId: number) => { 
    timeout.delete(intervalId);
    originalClearInterval(intervalId);
  };

  return {
    recover: () => { 
      timeout.forEach((intervalId) => {
        originalClearInterval(intervalId);
      });
    },
    override: {
      setInterval,
      clearInterval,
      setImmediate: (fn) => setTimeout(fn, 0),
    }
  };
}