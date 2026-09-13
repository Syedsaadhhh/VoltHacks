const configuredOrigin = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_BACKEND_ORIGIN
  ?.trim()
  .replace(/\/+$/, "");

export const backendOrigin = configuredOrigin || window.location.origin;

export const apiUrl = (path: string) =>
  new URL(path, `${backendOrigin}/`).toString();

export const websocketUrl = (path: string) => {
  const url = new URL(path, `${backendOrigin}/`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
};

export const warmBackend = () => {
  if (backendOrigin === window.location.origin) return;
  void fetch(apiUrl("/api/health"), {
    cache: "no-store",
    mode: "cors",
  }).catch(() => undefined);
};
