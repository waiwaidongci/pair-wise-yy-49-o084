import { f as ssr_context, i as setContext, g as getContext } from "./index.js";
import "clsx";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
const _contextKey = /* @__PURE__ */ Symbol("QueryClient");
const getQueryClientContext = () => {
  const client = getContext(_contextKey);
  if (!client) {
    throw new Error("No QueryClient was found in Svelte context. Did you forget to wrap your component with QueryClientProvider?");
  }
  return client;
};
const setQueryClientContext = (client) => {
  setContext(_contextKey, client);
};
const _isRestoringContextKey = /* @__PURE__ */ Symbol("isRestoring");
const getIsRestoringContext = () => {
  try {
    const isRestoring = getContext(_isRestoringContextKey);
    return isRestoring ?? { current: false };
  } catch (error) {
    return { current: false };
  }
};
export {
  getQueryClientContext as a,
  getIsRestoringContext as g,
  onDestroy as o,
  setQueryClientContext as s
};
