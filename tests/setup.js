// Minimal browser-global stubs so page/lib modules can be imported under plain Node.
// Real DOM rendering isn't exercised here — only the pure logic functions are under test,
// and each module's "if (document.getElementById(...)) init()" guards need `document` to exist.

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (!globalThis.localStorage) {
  globalThis.localStorage = new MemoryStorage();
}

if (!globalThis.document) {
  globalThis.document = {
    getElementById: () => null,
  };
}
