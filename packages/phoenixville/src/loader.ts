
export function isJavaScript(type: string) {
  return /application\/javascript/.test(type);
}

export function isCss(type: string) {
  return /text\/css/.test(type);
}

export function isHtml(type: string) { 
  return /text\/html/.test(type);
}

export async function request(url: string) {
  const res = await fetch(url);
  const content = await res.text();
  const type = res.headers.get("content-type") || "";
  const size = Number(res.headers.get("content-size"));

  return {
    content,
    type,
    size
  }
}