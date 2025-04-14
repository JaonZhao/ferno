
export function setAttribute(node: HTMLElement, name: string, value: any) {
  node.setAttribute(name, value);
}

export function createElement(name: string) {
  return document.createElement(name);
}

export function removeElement(element: Element) {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
  return false;
}