// Adds Map and WeakMap.getOrInsertComputed to browsers that do not have it yet.
// The bundled PDF.js (vendor/pdf.min.js) calls it, and it is newer than some browsers.
// Loaded as a normal script before pdf-tools.js.
(() => {
  for (const Type of [Map, WeakMap]) {
    if (typeof Type.prototype.getOrInsertComputed === 'function') continue;
    Object.defineProperty(Type.prototype, 'getOrInsertComputed', {
      configurable: true,
      writable: true,
      value: function getOrInsertComputed(key, callback) {
        if (this.has(key)) return this.get(key);
        const value = callback(key);
        this.set(key, value);
        return value;
      },
    });
  }
})();
