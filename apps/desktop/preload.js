const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose safe APIs if needed
});
