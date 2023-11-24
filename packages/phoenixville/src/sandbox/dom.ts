

const ELEMENT_NODE = window.Element.prototype.ELEMENT_NODE;


function isElement(element: Element) {
  return element.nodeType === ELEMENT_NODE;
}

export function removeElementNode() {

}

function getAttributes(element: Element) {
  return element
    .getAttributeNames()
    .map((name) => ({
      name,
      value: element.getAttribute(name)
    }))
    .reduce((acc, obj) => ({
      ...acc,
      [obj.name]: obj.value
    }), {});
}

function attributesToString(attributes: Record<PropertyKey, any>) {
  if (!attributes || attributes.length === 0) {
    return "";
  }
  return Object
    .keys(attributes)
    .reduce((total, key) => {
      const value = attributes[key];
      return total + (value ? `${key}="${value}" ` : key)
    }, "");
}

export function removeElement(element: Element | Comment) {
  const parentNode = element && element.parentNode;
  if (parentNode) {
    parentNode.removeChild(element)
  }
}

export function createLinkCommonNode(element: HTMLLinkElement) {
  const str = attributesToString(getAttributes(element));
  return document.createComment(`<link ${str.slice(0, -1)}></link>`);
}


export function createScriptCommentNode(element: HTMLScriptElement) {
  const content = element.textContent || element.text || "";
  const str = attributesToString(getAttributes(element));
  return document.createComment(`
    <script ${str} execute by garfish>${content}</script>
  `);
}

