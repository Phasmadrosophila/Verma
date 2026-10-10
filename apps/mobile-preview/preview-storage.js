// Demo links start from synthetic fixtures and never touch saved browser data.
export function previewStorage(search, getStorage = () => localStorage) {
  const demo = new URLSearchParams(search).get('demo') === '1';
  return {
    getItem(key) {
      if (demo) return null;
      try { return getStorage().getItem(key); } catch { return null; }
    },
    setItem(key, value) {
      if (demo) return;
      try { getStorage().setItem(key, value); } catch {}
    },
  };
}
