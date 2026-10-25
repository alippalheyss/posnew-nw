const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const url = require('url');

// Enable kiosk printing so window.print() and iframe.print() print silently without any dialog
// In Chromium, kiosk-printing automatically suppresses the print dialog and sends directly to printer
app.commandLine.appendSwitch('kiosk-printing');
app.commandLine.appendSwitch('disable-print-preview');

let mainWindow = null;

// Ensure single instance lock so multiple copies aren't opened accidentally
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'MVPOS Terminal',
    autoHideMenuBar: true,
    show: false, // Show when ready to prevent white flash
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'app-icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Remove default application menu for a sleek kiosk POS look
  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the built index.html from dist
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadURL(
      url.format({
        pathname: indexPath,
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  // Gracefully show window once ready-to-show
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Global F11 key toggle for True Fullscreen / Kiosk mode
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      const isFull = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFull);
      event.preventDefault();
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Get installed Windows printers (e.g. thermal POS printers)
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Error fetching printers:', err);
    return [];
  }
});

// Silent thermal printing handler
ipcMain.handle('print-silent', async (event, { html, deviceName, silent = true }) => {
  return new Promise((resolve) => {
    try {
      // Create a background hidden window with thermal receipt aspect ratio
      const printWin = new BrowserWindow({
        show: false,
        width: 340,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // If html is already a full document, use it directly to avoid invalid double-wrapping
      const isFullDoc = typeof html === 'string' && (html.includes('<html') || html.includes('<!DOCTYPE'));
      const printHtml = isFullDoc
        ? html
        : `<!DOCTYPE html>
           <html>
             <head>
               <meta charset="utf-8" />
               <title>Receipt</title>
               <style>
                 @page { margin: 0; size: auto; }
                 html, body {
                   margin: 0;
                   padding: 6px;
                   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                   color: #000;
                   background: #fff;
                 }
               </style>
             </head>
             <body>${html}</body>
           </html>`;

      printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(printHtml)}`);

      printWin.webContents.on('did-finish-load', () => {
        // Wait 300ms for layout & fonts to fully compute before printing
        setTimeout(async () => {
          let targetDevice = '';
          try {
            const printers = await printWin.webContents.getPrintersAsync();
            if (deviceName && printers.length > 0) {
              const cleanReq = String(deviceName).trim().toLowerCase();
              const match = printers.find(p => p.name.trim().toLowerCase() === cleanReq);
              if (match) {
                targetDevice = match.name;
              }
            }
            // If requested device wasn't matched or not provided, pick Windows default printer
            if (!targetDevice && printers.length > 0) {
              const defaultP = printers.find(p => p.isDefault) || printers[0];
              if (defaultP) {
                targetDevice = defaultP.name;
              }
            }
          } catch (pErr) {
            console.warn('Could not query printersAsync:', pErr);
          }

          const printOptions = {
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' },
            usePrinterDefaultPageSize: true,
          };

          if (targetDevice) {
            printOptions.deviceName = targetDevice;
          }

          printWin.webContents.print(
            printOptions,
            (success, failureReason) => {
              // Delay window destruction so Windows spooler can finish reading print buffer
              setTimeout(() => {
                if (!printWin.isDestroyed()) {
                  printWin.close();
                }
              }, 2000);

              if (!success) {
                console.warn('Print failed:', failureReason);
                resolve({ success: false, error: failureReason });
              } else {
                resolve({ success: true });
              }
            }
          );
        }, 300);
      });
    } catch (err) {
      console.error('Print silent error:', err);
      resolve({ success: false, error: err.message });
    }
  });
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});
