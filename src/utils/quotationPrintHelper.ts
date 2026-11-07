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
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '1021550GST501';
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
/**
 * A4 Clean Minimalist Professional Quotation PDF
 */
export const downloadQuotationA4Pdf = (quotation: Quotation, settings: AppSettings) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const shop = (settings?.shop || {}) as Partial<AppSettings['shop']>;
  const currency = shop.currency || 'MVR';
  const shopName = shop.shopName || 'MVPOS Store';
  const shopAddress = shop.shopAddress || shop.address || '';
  const shopPhone = shop.shopPhone || shop.contactNumber || shop.phone || '';
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '1021550GST501';
  const shopLogo = shop.logo || '';

  const customerName = quotation.customer?.name_en || quotation.customer?.name_dv || quotation.customer_name || 'Valued Customer';
  const customerPhone = quotation.customer?.phone || quotation.customer_phone || '';

  // Accurately compute validity days
  let validityDays = quotation.validity_days;
  if (!validityDays && quotation.date && quotation.valid_until) {
    const diff = new Date(quotation.valid_until).getTime() - new Date(quotation.date).getTime();
    if (diff > 0) {
      validityDays = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
    }
  }
  validityDays = validityDays || 7;

  // ==========================================
  // 1. TOP ACCENT LINE & CLEAN WHITE HEADER
  // ==========================================
  // Subtle top accent bar (2mm clean sky blue)
  doc.setFillColor(2, 132, 199); // Sky-600
  doc.rect(0, 0, 210, 2.5, 'F');

  let textStartX = 14;

  // Render Shop Logo directly on white page if available
  if (shopLogo) {
    try {
      const format = shopLogo.includes('image/jpeg') || shopLogo.includes('.jpg') || shopLogo.includes('.jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(shopLogo, format, 14, 9, 24, 24);
      textStartX = 44;
    } catch {
      textStartX = 14;
    }
  }

  // Shop Name (Crisp Dark Slate)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(shopName.toUpperCase(), textStartX, 16);

  // Shop Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  if (shopAddress) {
    doc.text(shopAddress, textStartX, 22);
  }

  const contactLine = [
    shopPhone ? `Tel: ${shopPhone}` : '',
    shopTin ? `TIN: ${shopTin}` : '',
  ].filter(Boolean).join('   |   ');
  if (contactLine) {
    doc.text(contactLine, textStartX, 27.5);
  }

  // Right Side: Quotation Title (Clean Ocean Blue) & Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text('QUOTATION', 196, 16, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ref: ${quotation.quotation_number}`, 196, 22.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(quotation.date)}`, 196, 28, { align: 'right' });

  // Clean Subtle Header Separator Line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(14, 35, 196, 35);

  // ==========================================
  // 2. CLIENT & QUOTATION DETAILS
  // ==========================================
  const detailsY = 43;

  // Left: Customer Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('QUOTATION ISSUED TO:', 14, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(customerName.toUpperCase(), 14, detailsY + 6.5);

  if (customerPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Phone: ${customerPhone}`, 14, detailsY + 12.5);
  }

  // Right: Validity Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('QUOTATION DETAILS:', 135, detailsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Quotation Date:', 135, detailsY + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(quotation.date), 196, detailsY + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Valid Until:', 135, detailsY + 12.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text(`${formatDate(quotation.valid_until)} (${validityDays} Days)`, 196, detailsY + 12.5, { align: 'right' });

  // ==========================================
  // 3. CLEAN ITEMS TABLE
  // ==========================================
  const tableRows = quotation.items.map((item, idx) => [
    idx + 1,
    item.name_en || item.name_dv || 'Item',
    item.qty,
    `${currency} ${Number(item.price).toFixed(2)}`,
    `${currency} ${(Number(item.price) * Number(item.qty)).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 63,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total Amount']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [241, 245, 249], // Very subtle Slate-100
      textColor: [15, 23, 42],     // Dark Slate
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      lineColor: [226, 232, 240], // Light clean border
      lineWidth: 0.1,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: [100, 116, 139] },
      1: { cellWidth: 105, fontStyle: 'bold', textColor: [15, 23, 42] },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
    },
  });

  interface AutoTableDoc extends jsPDF {
    lastAutoTable: { finalY: number };
  }
  const finalY = (doc as unknown as AutoTableDoc).lastAutoTable.finalY + 8;

  // ==========================================
  // 4. FINANCIAL SUMMARY & TERMS
  // ==========================================
  const hasGst = quotation.tax_amount > 0;

  // Financial Summary (Right)
  const summaryX = 135;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryX, finalY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} ${quotation.subtotal.toFixed(2)}`, 196, finalY + 4, { align: 'right' });

  if (hasGst) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`GST (${shop.taxRate || 8}%):`, summaryX, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${currency} ${quotation.tax_amount.toFixed(2)}`, 196, finalY + 10, { align: 'right' });
  }

  // Divider Line before Total
  const totalLineY = hasGst ? finalY + 14 : finalY + 8;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(summaryX, totalLineY, 196, totalLineY);

  // Grand Total Line (Clean, Elegant Typography)
  const grandTotalTextY = totalLineY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX, grandTotalTextY);

  doc.setFontSize(11.5);
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text(`${currency} ${quotation.grand_total.toFixed(2)}`, 196, grandTotalTextY, { align: 'right' });

  // Notes & Terms (Left)
  let notesEndY = finalY;
  if (quotation.notes) {
    const splitNotes = doc.splitTextToSize(quotation.notes, 105);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('TERMS & CONDITIONS:', 14, finalY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(splitNotes, 14, finalY + 9.5);
    notesEndY = finalY + 9.5 + (splitNotes.length * 4);
  }

  // ==========================================
  // 5. SIGNATURE & GENERATION LINE
  // ==========================================
  const afterTotalY = Math.max(grandTotalTextY + 6, notesEndY) + 6;

  // Signature Line
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, afterTotalY + 12, 70, afterTotalY + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signature & Stamp', 14, afterTotalY + 16.5);

  // Generation timestamp on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleDateString()} | ${shopName}`, 196, afterTotalY + 16.5, { align: 'right' });

  doc.save(`Quotation_${quotation.quotation_number}.pdf`);
};
