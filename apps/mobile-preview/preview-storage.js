// Demo links start from synthetic fixtures and never touch persisted localStorage.
export function previewStorage(search, getStorage = () => localStorage) {
  const demo = new URLSearchParams(search).get('demo') === '1';
  const mem = new Map();
  return {
    getItem(key) {
      if (demo) return mem.get(key) ?? null;
      try { return getStorage().getItem(key); } catch { return null; }
    },
    setItem(key, value) {
      if (demo) {
        mem.set(key, value);
        return;
      }
      try { getStorage().setItem(key, value); } catch {}
    },
  };
}
