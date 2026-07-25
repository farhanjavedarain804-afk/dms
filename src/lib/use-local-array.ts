import { useEffect, useState } from "react";

/** Read a localCrud-stored array from localStorage and re-read on tab updates. */
export function useLocalArray<T>(key: string): T[] {
  const storageKey = `dms:${key}`;
  const [rows, setRows] = useState<T[]>([]);

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        setRows(raw ? (JSON.parse(raw) as T[]) : []);
      } catch {
        setRows([]);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === storageKey) read();
    };
    const onFocus = () => read();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    const t = window.setInterval(read, 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(t);
    };
  }, [storageKey]);

  return rows;
}
