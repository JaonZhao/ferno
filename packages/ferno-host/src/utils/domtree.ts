import posthtml from "posthtml";

const NS = 'http://www.w3.org/2000/svg';
const X_Char = 120; // "x" char
const COLON_CHAR = 58; // ":" char
const XLINK_NS = 'http://www.w3.org/1999/xlink'; // xmlns:xlink
const XML_NS = 'http://www.w3.org/XML/1998/namespace'; // xmlns
const X_LINK_PREFIX = 'xlink';
const SVG_TAGS =
  'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
  'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
  'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
  'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
  'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
  'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
  'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
  'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
  'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
  'text,textPath,title,tspan,unknown,use,view';
const SVG_SET = new Set(SVG_TAGS.split(","));

const isSvg = (node) => SVG_SET.has(node.tag);
const isText = (node) => typeof node === "string";
const isElement = (node) => typeof node === "object" && node.hasOwnProperty("tag");
const isComment = (node) => typeof node === "object" && node.hasOwnProperty("comment");
function appendAttributes(el: Element, attributes: Record<string, any>) { 
  if (!attributes) {
    return;
  }

  Object.keys(attributes)
    .forEach(key => {
      const value = attributes[key];
      if (value === null) {
        el.setAttribute(key, '');
      } else if (typeof value === 'string') {
        if (key.charCodeAt(0) !== X_Char) {
          el.setAttribute(key, value);
        } else if (key.charCodeAt(3) === COLON_CHAR) {
          el.setAttributeNS(XML_NS, key, value);
        } else if (key.charCodeAt(5) === COLON_CHAR && key.slice(0, 5) === X_LINK_PREFIX) {
          el.setAttributeNS(XLINK_NS, key, value);
        } else {
          el.setAttribute(key, value);
        }
      }
    });
};


export async function compileDocument(doc: Document) {
  const { tree } = await posthtml().process(`<html>${doc.documentElement.innerHTML}</html>`);

  //@ts-ignore
  return Array.from(tree);
}

export async function paintDom(
  domTree: Array<any>,
  root: Element,
  customerRender: Record<PropertyKey, (any) => Promise<any> | void | Object | null>
) {
  const paintDomTeeNode = async (node, parentEl) => { 
    if (isElement(node) && customerRender[node.tag]) {
      node = await customerRender[node.tag](node);
    }

    if (!node) {
      return;
    }

    let el;
    if (isText(node)) {
      el = document.createTextNode(node);
      parentEl && parentEl.appendChild(el);
    } else if (isComment(node)) {
      const comment = node.comment || "";
      el = document.createComment(comment);
      parentEl && parentEl.appendChild(el);
    } else if (isElement(node)) {
      el = isSvg(node)
        ? document.createElementNS(NS, node.tag!)
        : document.createElement(node.tag);

      const attrs = Object.assign({}, node.attrs);
      appendAttributes(el, attrs);

      parentEl && parentEl.appendChild(el);

      const children = node.content;
      if (!Array.isArray(children) || children.length === 0) {
        return;
      }

      children.forEach(child => {
        paintDomTeeNode(child, el);
      });
    }
  };

  for (const domTreeNode of domTree) {
    await paintDomTeeNode(domTreeNode, root!);
  }

  return root;
}

export function getAttribute(node, name: string) {
  if (!node || typeof node.attrs !== "object") {
    return undefined
  }

  return node.attrs[name];
}