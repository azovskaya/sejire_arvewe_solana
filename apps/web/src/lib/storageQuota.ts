/** Browser localStorage quota (Chrome 22, Firefox 1014). */
export function isQuotaExceeded(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: string; code?: number };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.code === 22 ||
    err.code === 1014
  );
}

export const STORAGE_QUOTA_HINT =
  "Черновик не влез в память браузера. Выгрузите JSON — иначе правки могут пропасть после закрытия вкладки.";

/** JSON.stringify + setItem. Returns false on quota; rethrows other errors. */
export function setLocalJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) return false;
    throw e;
  }
}
