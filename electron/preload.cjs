const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  
  // Printing APIs
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  forceClose: () => ipcRenderer.send('window-force-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
  onCloseRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app-close-requested', listener);
    return () => ipcRenderer.removeListener('app-close-requested', listener);
  },
  
  // Cash drawer
  kickCashDrawer: (printerName) => ipcRenderer.invoke('kick-cash-drawer', printerName),
  
  // Version info
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
