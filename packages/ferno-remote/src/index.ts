interface Provider {
  render: (options: { basename: string, dom: HTMLElement, props: Record<PropertyKey, any> }) => void;
  destroy: (options: { basename: string, dom: HTMLElement, props: Record<PropertyKey, any> }) => void;
}

declare global {
  interface Window {
    __GARFISH__: boolean;
  }
}
declare const __GARFISH_EXPORTS__: {
  registerProvider: (provider: any) => void;
};

export function isInMicroShell() {
  return typeof __GARFISH_EXPORTS__ === "object" &&
    __GARFISH_EXPORTS__;
}

export function registerProvider(provider: Provider) {
  if (isInMicroShell()) {
    __GARFISH_EXPORTS__.registerProvider(provider);
  }
}

export function push() {}

export function replace() {}