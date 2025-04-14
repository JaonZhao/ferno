


export function getPath(basename: string = '/', pathname?: string) {
  if (basename === '/' || basename === '') {
    return pathname || location.pathname;
  } else {
    return (pathname || location.pathname).replace(
      new RegExp(`^/?${basename}`),
      '',
    );
  }
}

export function isAbsoluteUrl(url: string) {  
  return (/^(https?:)?\/\/.+/).test(url);
}

export function transformUrl(resolvePath: string, curPath: string) {  
  const baseUrl = new URL(resolvePath, location.href);
  const realPath = new URL(curPath, baseUrl.href);
  return realPath.href;
}