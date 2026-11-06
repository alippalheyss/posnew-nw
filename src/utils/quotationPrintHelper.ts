import { Quotation, AppSettings } from '@/context/AppContext';
import { printContent } from '@/utils/printHelper';
import { formatDate, formatTime } from '@/utils/formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * 80mm Thermal Slip for Quotations (English-Only, No Dhivehi, with Shop Logo and Complete Shop Info)
 */
export const printQuotation80mm = (quotation: Quotation, settings: AppSettings) => {
  const shop = (settings?.shop || {}) as Partial<AppSettings['shop']>;
  const currency = shop.currency || 'MVR';
  const shopName = shop.shopName || 'MVPOS Store';
  const shopPhone = shop.shopPhone || shop.contactNumber || shop.phone || '';
  const shopAddress = shop.shopAddress || shop.address || '';
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '';
  const shopLogo = shop.logo || '';

  const customerName = quotation.customer?.name_en || quotation.customer?.name_dv || quotation.customer_name || 'Valued Customer';
  const customerPhone = quotation.customer?.phone || quotation.customer_phone || '';

  const itemsHtml = quotation.items.map((item, idx) => {
    const name = item.name_en || item.name_dv || 'Item';
    const total = (Number(item.price || 0) * Number(item.qty || 0)).toFixed(2);
    return `
      <div style="margin-bottom: 5px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${idx + 1}. ${name}</span>
          <span>${total}</span>
        </div>
        <div style="font-size: 10px; color: #555; padding-left: 10px;">
          ${item.qty} × ${currency} ${Number(item.price).toFixed(2)}
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <meta charset="utf-8" />
      <title>Quotation ${quotation.quotation_number}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          width: 72mm;
          margin: 0 auto;
          padding: 8px 4px;
          color: #000;
          line-height: 1.35;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .bold { font-weight: bold; }
        .banner {
          border: 2px solid #000;
          padding: 4px;
          margin: 6px 0;
          text-align: center;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .logo-container {
          text-align: center;
          margin-bottom: 6px;
        }
        .logo-container img {
          max-height: 52px;
          max-width: 140px;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      ${shopLogo ? `
        <div class="logo-container">
          <img src="${shopLogo}" alt="Shop Logo" />
        </div>
      ` : ''}

      <div class="text-center">
        <h2 style="margin: 0 0 2px 0; font-size: 16px; font-weight: 900;">${shopName}</h2>
        ${shopAddress ? `<div style="font-size: 11px; margin-bottom: 2px;">${shopAddress}</div>` : ''}
        ${shopPhone ? `<div style="font-size: 11px; margin-bottom: 2px;">Tel: ${shopPhone}</div>` : ''}
        ${shopTin ? `<div style="font-size: 10px;">TIN: ${shopTin}</div>` : ''}
      </div>

      <div class="banner">
        <div>QUOTATION</div>
        <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">*** NOT A TAX INVOICE ***</div>
      </div>

      <div style="font-size: 11px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Quotation No:</span>
          <span class="bold">${quotation.quotation_number}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Date:</span>
          <span>${formatDate(quotation.date)} ${formatTime(quotation.date)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Valid Until:</span>
          <span class="bold">${formatDate(quotation.valid_until)}</span>
        </div>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between;">
          <span>Customer:</span>
          <span class="bold">${customerName}</span>
        </div>
        ${customerPhone ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Phone:</span>
          <span>${customerPhone}</span>
        </div>` : ''}
      </div>

      <div class="divider"></div>
      <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>Item Description</span>
        <span>Price (${currency})</span>
      </div>
      <div class="divider"></div>

      ${itemsHtml}

      <div class="divider"></div>

      <div style="font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>Subtotal:</span>
          <span>${currency} ${quotation.subtotal.toFixed(2)}</span>
        </div>
        ${quotation.tax_amount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>GST (${shop.taxRate || 8}%):</span>
          <span>${currency} ${quotation.tax_amount.toFixed(2)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
          <span>Grand Total:</span>
          <span>${currency} ${quotation.grand_total.toFixed(2)}</span>
        </div>
      </div>

      ${quotation.notes ? `
      <div class="divider"></div>
      <div style="font-size: 10px; color: #444;">
        <strong>Note:</strong> ${quotation.notes}
      </div>` : ''}

      <div class="divider"></div>
      <div class="text-center" style="font-size: 10px; color: #666; margin-top: 6px;">
        <div>This is a price quotation. Subject to stock availability.</div>
        <div style="margin-top: 3px; font-weight: bold;">Thank you for your business!</div>
      </div>
    </body>
    </html>
  `;

  printContent(html, settings);
};

/**
 * A4 Professional PDF Generator for Quotations (with Complete Shop Info, Shop Logo, Bold Customer, No Barcode Column, No Status)
 */
export const downloadQuotationA4Pdf = (quotation: Quotation, settings: AppSettings) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const shop = (settings?.shop || {}) as Partial<AppSettings['shop']>;
  const currency = shop.currency || 'MVR';
  const shopName = shop.shopName || 'MVPOS Store';
  const shopAddress = shop.shopAddress || shop.address || '';
  const shopPhone = shop.shopPhone || shop.contactNumber || shop.phone || '';
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '';
  const shopLogo = shop.logo || '';

  const customerName = quotation.customer?.name_en || quotation.customer?.name_dv || quotation.customer_name || 'Valued Customer';
  const customerPhone = quotation.customer?.phone || quotation.customer_phone || '';

  // Header Box
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 38, 'F');

  let textStartX = 14;

  // 1. Render Shop Logo if available
  if (shopLogo) {
    try {
      const format = shopLogo.includes('image/jpeg') || shopLogo.includes('.jpg') || shopLogo.includes('.jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(shopLogo, format, 14, 6, 26, 26);
      textStartX = 45;
    } catch (e) {
      // Fallback without logo shift if format fails
      textStartX = 14;
    }
  }

  // Shop Name & Complete Information
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(shopName.toUpperCase(), textStartX, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const headerDetails = [
    shopAddress,
    shopPhone ? `Phone: ${shopPhone}` : '',
    shopTin ? `Shop TIN: ${shopTin}` : '',
  ].filter(Boolean).join('  |  ');
  doc.text(headerDetails, textStartX, 26);

  // Big Title Right Side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(56, 189, 248); // Sky 400
  doc.text('PRICE QUOTATION', 196, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Ref: ${quotation.quotation_number}`, 196, 26, { align: 'right' });

  // Metadata Panel
  doc.setTextColor(51, 65, 85);

  // Customer Info (Left) — BOLD Customer Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION ISSUED TO:', 14, 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName.toUpperCase(), 14, 55);

  if (customerPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Phone: ${customerPhone}`, 14, 62);
  }

  // Quote Info (Right) — Clean Date & Valid Until (No Status)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('QUOTATION DETAILS:', 140, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Quotation Date: ${formatDate(quotation.date)}`, 140, 54);
  doc.text(`Valid Until: ${formatDate(quotation.valid_until)}`, 140, 60);

  // Items Table — Product Barcode Column Removed!
  const tableRows = quotation.items.map((item, idx) => [
    idx + 1,
    item.name_en || item.name_dv || 'Item',
    item.qty,
    `${currency} ${Number(item.price).toFixed(2)}`,
    `${currency} ${(Number(item.price) * Number(item.qty)).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 105 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
  });

  interface AutoTableDoc extends jsPDF {
    lastAutoTable: { finalY: number };
  }
  const finalY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 8;

  // Financial Summary Box (Right)
  const summaryX = 130;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Subtotal:', summaryX, finalY);
  doc.text(`${currency} ${quotation.subtotal.toFixed(2)}`, 196, finalY, { align: 'right' });

  if (quotation.tax_amount > 0) {
    doc.text(`GST (${shop.taxRate || 8}%):`, summaryX, finalY + 6);
    doc.text(`${currency} ${quotation.tax_amount.toFixed(2)}`, 196, finalY + 6, { align: 'right' });
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX, finalY + 9, 196, finalY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX, finalY + 16);
  doc.text(`${currency} ${quotation.grand_total.toFixed(2)}`, 196, finalY + 16, { align: 'right' });

  // Notes & Terms (Left)
  if (quotation.notes) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('TERMS & NOTES:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(quotation.notes, 105), 14, finalY + 5);
  }

  // Footer & Signature Line
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(203, 213, 225);
  doc.line(14, pageHeight - 35, 70, pageHeight - 35);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signature & Stamp', 14, pageHeight - 30);

  doc.text(`Generated on ${new Date().toLocaleDateString()} | ${shopName}`, 196, pageHeight - 15, { align: 'right' });

  doc.save(`Quotation_${quotation.quotation_number}.pdf`);
};
