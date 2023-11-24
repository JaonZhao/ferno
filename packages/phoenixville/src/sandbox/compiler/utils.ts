export function transformUrl(resolvePath: string, curPath: string) {
  const baseUrl = new URL(resolvePath, location.href);
  const realPath = new URL(curPath, baseUrl.href);
  return realPath.href;
}

const SOURCEMAP_REG = /[@#] sourceMappingURL=/g;
export function haveSourcemap(code: string) {
  return SOURCEMAP_REG.test(code);
}