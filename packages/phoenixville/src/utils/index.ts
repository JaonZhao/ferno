import urlParse from "url-parse";

function parseUrl(entry: string) {
  const { origin, pathname } = urlParse(entry);
  return { origin, pathname };
}

export function joinUrl(entry: string, relativePath: string) {
  const { origin, pathname } = urlParse(entry);
  const startWith = (url: string, prefix: string) => url.slice(0, prefix.length) === prefix;

  if (startWith(relativePath, "./")) {
    const rPath = relativePath.slice(1);

    if (!pathname || pathname === "/") {
      return `${origin}${rPath}`;
    }

    const pathArr = pathname.split("/");
    pathArr.splice(-1);
    return `${origin}${pathArr.join('/')}${rPath}`;
  } else if (startWith(relativePath, "/")) {
    return `${origin}${relativePath}`;
  } else {
    return `${origin}/${relativePath}`;
  }
}

export function makeMap<T extends Array<PropertyKey>>(list: T) { 
  const map: { [k in T[number]]: true } = Object.create(null);
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }

  return (val: PropertyKey) => !!map[val];
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwn(obj: any, key: PropertyKey): boolean {
  return hasOwnProperty.call(obj, key);
}

// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
export function isAbsolute(url: string) {
  // `c:\\` 这种 case 返回 false，在浏览器中使用本地图片，应该用 file 协议
  if (!/^[a-zA-Z]:\\/.test(url)) {
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
      return true;
    }
  }
  return false;
}