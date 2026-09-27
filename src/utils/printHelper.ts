/**
 * Centralized printing utility for the POS system.
 */

/**
 * Prints HTML content using a hidden iframe.
 * This is smoother than window.open and allows for silent printing
 * if the browser is launched in Kiosk Mode (--kiosk-printing).
 */
export const printViaIframe = (htmlContent: string) => {
  // Remove any stale print iframes
  const existingIframe = document.getElementById('print-iframe');
  if (existingIframe && document.body.contains(existingIframe)) {
    try {
      document.body.removeChild(existingIframe);
    } catch (e) {
      // ignore
    }
  }

  const iframe = document.createElement('iframe');
  
  // Hide the iframe securely without breaking rendering
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  iframe.style.border = '0';
  iframe.setAttribute('id', 'print-iframe');
  
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Could not access iframe document');
    window.focus();
    window.dispatchEvent(new CustomEvent('pos-print-finished'));
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  let printed = false;
  let cleanedUp = false;

  const cleanupAndRestoreFocus = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    try {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    } catch (e) {
      // ignore
    }

    // Force focus back to main window so keyboard and inputs stay responsive
    window.focus();
    window.dispatchEvent(new CustomEvent('pos-print-finished'));
  };

  const print = () => {
    if (printed) return;
    printed = true;

    try {
      if (iframe.contentWindow) {
        // Listen to afterprint on iframe content window
        iframe.contentWindow.addEventListener('afterprint', cleanupAndRestoreFocus, { once: true });
      }
      // Also listen on main window as standard fallback
      window.addEventListener('afterprint', cleanupAndRestoreFocus, { once: true });

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (error) {
      console.error('Print trigger error:', error);
      cleanupAndRestoreFocus();
    }

    // Safety fallback: if afterprint doesn't fire in the environment, clean up after timeout
    setTimeout(cleanupAndRestoreFocus, 10000);
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => setTimeout(print, 100);
    // Fallback if onload doesn't fire
    setTimeout(print, 350);
  } else {
    print();
  }
};

/**
 * Universal print function that chooses the method based on settings.
 */
export const printContent = async (htmlContent: string, settings?: any) => {
  if (settings?.printing?.useQzTray && settings?.printing?.printerName) {
    try {
      await printViaQz(htmlContent, settings.printing.printerName);
      return;
    } catch (error) {
      console.error('QZ Tray print failed, falling back to iframe', error);
    }
  }
  
  // Fallback to standard iframe printing
  printViaIframe(htmlContent);
};

/**
 * [BETA] Direct Hardware Printing via Web Serial API.
 * This sends raw text directly to the printer's serial port.
 * Bypasses the browser print dialog entirely.
 */
let port: any = null;

export const connectPrinter = async () => {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API not supported in this browser');
  }

  try {
    // @ts-ignore
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    return true;
  } catch (error) {
    console.error('Error connecting to printer:', error);
    throw error;
  }
};

export const printDirect = async (text: string) => {
  if (!port) {
    throw new Error('Printer not connected. Please connect via Admin settings.');
  }

  const encoder = new TextEncoder();
  const writer = port.writable.getWriter();
  
  try {
    // Basic ESC/POS reset and text
    const data = encoder.encode('\x1b\x40' + text + '\n\n\n\n\x1d\x56\x41\x03'); // Reset + Text + Feed + Cut
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
};

/**
 * QZ Tray Support
 * Requires qz-tray.js to be loaded in index.html
 */
// @ts-ignore
const getQz = () => (window as any).qz;

export const initQz = async () => {
  const qz = getQz();
  if (!qz) throw new Error('QZ Tray library not loaded');
  
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
};

export const findPrinters = async () => {
  await initQz();
  const qz = getQz();
  return await qz.printers.find();
};

export const printViaQz = async (htmlContent: string, printerName: string) => {
  try {
    await initQz();
    const qz = getQz();
    
    // Create a configuration for the specific printer
    const config = qz.configs.create(printerName);
    
    // Create the print data
    const data = [{
      type: 'html',
      format: 'plain',
      data: htmlContent
    }];
    
    await qz.print(config, data);
    return true;
  } catch (error) {
    console.error('QZ Print Error:', error);
    throw error;
  }
};
