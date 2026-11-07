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
 * A4 Clean Modern Quotation PDF (Light Blue & Emerald Green Theme)
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
  // 1. LIGHT CLEAN TOP BAR / HEADER (Sky-50 with Emerald & Sky Accent)
  // ==========================================
  const headerHeight = 44;
  
  // Soft airy light blue background
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.rect(0, 0, 210, headerHeight, 'F');

  // Top Dual Accent Stripe (Emerald Green & Light Sky Blue)
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 0, 105, 3.5, 'F');
  doc.setFillColor(14, 165, 233); // Sky-500
  doc.rect(105, 0, 105, 3.5, 'F');

  // Bottom Subtle Divider Line
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.setLineWidth(0.4);
  doc.line(0, headerHeight, 210, headerHeight);

  let textStartX = 14;

  // Render Shop Logo in a clean white rounded container if available
  if (shopLogo) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(186, 230, 253); // Sky-200
      doc.roundedRect(14, 8, 28, 28, 3, 3, 'FD');

      const format = shopLogo.includes('image/jpeg') || shopLogo.includes('.jpg') || shopLogo.includes('.jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(shopLogo, format, 16, 10, 24, 24);
      textStartX = 48;
    } catch {
      textStartX = 14;
    }
  }

  // Shop Name (Vibrant Ocean Blue)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(3, 105, 161); // Sky-700
  doc.text(shopName.toUpperCase(), textStartX, 17);

  // Shop Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  if (shopAddress) {
    doc.text(shopAddress, textStartX, 23);
  }

  // Contact line
  if (shopPhone) {
    doc.text(`Tel: ${shopPhone}`, textStartX, 28.5);
  }

  // Shop GST TIN Pill Badge (Light Emerald Green Pill)
  if (shopTin) {
    const tinY = shopAddress && shopPhone ? 32.5 : 28.5;
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(167, 243, 208); // Emerald-200
    doc.roundedRect(textStartX, tinY, 56, 6.5, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text(`GST TIN: ${shopTin}`, textStartX + 3, tinY + 4.5);
  }

  // Right Side: Quotation Title (Sky Blue) & Ref Pill
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text('QUOTATION', 196, 18, { align: 'right' });

  // Reference Number Pill (Right) - Light Sky Pill
  doc.setFillColor(224, 242, 254); // Sky-100
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.roundedRect(136, 22.5, 60, 7.5, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(3, 105, 161); // Sky-700
  doc.text(`REF: ${quotation.quotation_number}`, 166, 27.5, { align: 'center' });

  // Date line on header right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Date: ${formatDate(quotation.date)}  •  Valid: ${formatDate(quotation.valid_until)}`, 196, 37, { align: 'right' });

  // ==========================================
  // 2. CLIENT & QUOTATION DETAILS CARDS
  // ==========================================
  const cardsY = 51;
  const cardHeight = 25;

  // Left Card: Customer Details (Light Sky Card)
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.setLineWidth(0.4);
  doc.roundedRect(14, cardsY, 88, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text('QUOTATION ISSUED TO', 19, cardsY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(customerName.toUpperCase(), 19, cardsY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(customerPhone ? `Phone: ${customerPhone}` : 'Direct Customer', 19, cardsY + 19.5);

  // Right Card: Reference & Validity Details (Light Emerald Card)
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(167, 243, 208); // Emerald-200
  doc.roundedRect(108, cardsY, 88, cardHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Emerald-600
  doc.text('VALIDITY & SCHEDULE', 113, cardsY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Quotation Date:', 113, cardsY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(quotation.date), 191, cardsY + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Valid Until:', 113, cardsY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text(`${formatDate(quotation.valid_until)} (${validityDays} Days)`, 191, cardsY + 19.5, { align: 'right' });

  // ==========================================
  // 3. MODERN ITEMS TABLE (Sky-600 Blue Header)
  // ==========================================
  const tableRows = quotation.items.map((item, idx) => [
    idx + 1,
    item.name_en || item.name_dv || 'Item',
    item.qty,
    `${currency} ${Number(item.price).toFixed(2)}`,
    `${currency} ${(Number(item.price) * Number(item.qty)).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 81,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total Amount']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [2, 132, 199], // Sky-600 Light Ocean Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [240, 249, 255], // Soft Sky-50
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      lineColor: [224, 242, 254], // Sky-100
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: [100, 116, 139] },
      1: { cellWidth: 105, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
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
  const summaryBoxHeight = hasGst ? 32 : 24;

  // Financial Summary Card (Right)
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.setLineWidth(0.4);
  doc.roundedRect(125, finalY, 71, summaryBoxHeight, 2.5, 2.5, 'FD');

  const summaryTextX = 130;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryTextX, finalY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} ${quotation.subtotal.toFixed(2)}`, 191, finalY + 7, { align: 'right' });

  if (hasGst) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`GST (${shop.taxRate || 8}%):`, summaryTextX, finalY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${currency} ${quotation.tax_amount.toFixed(2)}`, 191, finalY + 14, { align: 'right' });
  }

  // Grand Total Highlight Pill (Fresh Emerald Green)
  const grandTotalTopY = hasGst ? finalY + 18 : finalY + 11;
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.roundedRect(128, grandTotalTopY, 65, 10, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', 133, grandTotalTopY + 6.8);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${currency} ${quotation.grand_total.toFixed(2)}`, 189, grandTotalTopY + 6.8, { align: 'right' });

  // Notes & Terms (Left - Soft Emerald Tint)
  let notesEndY = finalY;
  if (quotation.notes) {
    const splitNotes = doc.splitTextToSize(quotation.notes, 96);
    const notesHeight = Math.max(splitNotes.length * 4.5 + 8, summaryBoxHeight);

    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(167, 243, 208); // Emerald-200
    doc.setLineWidth(0.4);
    doc.roundedRect(14, finalY, 105, notesHeight, 2.5, 2.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text('TERMS & CONDITIONS', 19, finalY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitNotes, 19, finalY + 12);
    notesEndY = finalY + notesHeight;
  }

  // ==========================================
  // 5. SIGNATURE & GENERATION LINE
  // ==========================================
  const afterTotalY = Math.max(finalY + summaryBoxHeight, notesEndY) + 6;

  // Signature Line
  doc.setLineWidth(0.4);
  doc.setDrawColor(186, 230, 253); // Sky-200
  doc.line(14, afterTotalY + 14, 75, afterTotalY + 14);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signature & Official Stamp', 14, afterTotalY + 18.5);

  // Generation timestamp on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated on ${new Date().toLocaleDateString()} | ${shopName}`, 196, afterTotalY + 18.5, { align: 'right' });

  doc.save(`Quotation_${quotation.quotation_number}.pdf`);
};
