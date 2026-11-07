import { Sale, AppSettings } from '@/context/AppContext';
import { printContent } from '@/utils/printHelper';
import { formatDate, formatTime } from '@/utils/formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * 80mm Thermal Slip for Sales / Invoices (Matching Quotation Slip Style)
 * English-Only, Clean & Compact with Shop Logo, Complete Shop Info, and TIN
 */
export const printSale80mmSlip = (sale: Sale, settings: AppSettings) => {
  const shop = (settings?.shop || {}) as Partial<AppSettings['shop']>;
  const currency = shop.currency || 'MVR';
  const shopName = shop.shopName || 'MVPOS Store';
  const shopPhone = shop.shopPhone || shop.contactNumber || shop.phone || '';
  const shopAddress = shop.shopAddress || shop.address || '';
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '1021550GST501';
  const shopLogo = shop.logo || '';

  const isCredit = sale.paymentMethod === 'credit' || (sale.balance !== undefined && sale.balance > 0);
  const invoiceTitle = isCredit ? 'CREDIT INVOICE' : 'TAX INVOICE';
  const invoiceNumber = sale.invoiceNumber || sale.id;

  const customerName = sale.customer?.name_en || sale.customer?.name_dv || 'General Customer';
  const customerPhone = sale.customer?.phone || '';
  const customerCode = sale.customer?.code || '';

  const gstRate = Number(shop.taxRate) || 0;
  const subtotal = gstRate > 0 ? sale.grandTotal / (1 + gstRate / 100) : sale.grandTotal;
  const gstAmount = sale.grandTotal - subtotal;

  const paidAmount = Number(sale.paidAmount) || (isCredit ? 0 : sale.grandTotal);
  const balanceDue = isCredit ? Math.max(0, sale.grandTotal - paidAmount) : 0;
  const changeGiven = !isCredit && paidAmount > sale.grandTotal ? paidAmount - sale.grandTotal : 0;

  const itemsHtml = sale.items.map((item, idx) => {
    const name = item.name_en || item.name_dv || 'Item';
    const unitTag = item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : '';
    const flavourTag = item.selected_flavour ? ` [${item.selected_flavour}]` : '';
    const total = (Number(item.price || 0) * Number(item.qty || 0)).toFixed(2);
    return `
      <div style="margin-bottom: 5px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${idx + 1}. ${name}${flavourTag}${unitTag}</span>
          <span>${total}</span>
        </div>
        <div style="font-size: 10px; color: #555; padding-left: 10px;">
          ${item.qty} × ${currency} ${Number(item.price).toFixed(2)}
        </div>
      </div>
    `;
  }).join('');

  // Payment Breakdown
  let paymentDetailsHtml = '';
  if (isCredit) {
    paymentDetailsHtml = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Payment Method:</span>
        <span class="bold">CREDIT</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Paid Amount:</span>
        <span>${currency} ${paidAmount.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 900; margin-top: 3px; border-top: 1px dotted #888; padding-top: 3px;">
        <span>Balance Due:</span>
        <span>${currency} ${balanceDue.toFixed(2)}</span>
      </div>
    `;
  } else if (Array.isArray(sale.splitDetails) && sale.splitDetails.length > 0) {
    paymentDetailsHtml = sale.splitDetails.map((s: { method?: string; amount?: number }) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${s.method || 'Payment'}:</span>
        <span class="bold">${currency} ${Number(s.amount || 0).toFixed(2)}</span>
      </div>
    `).join('');
  } else {
    paymentDetailsHtml = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Payment Method:</span>
        <span class="bold" style="text-transform: uppercase;">${sale.paymentMethod || 'CASH'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Paid Amount:</span>
        <span>${currency} ${paidAmount.toFixed(2)}</span>
      </div>
      ${changeGiven > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Change Given:</span>
        <span class="bold">${currency} ${changeGiven.toFixed(2)}</span>
      </div>` : ''}
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html dir="ltr">
    <head>
      <meta charset="utf-8" />
      <title>${invoiceTitle} ${invoiceNumber}</title>
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
        <div>${invoiceTitle}</div>
      </div>

      <div style="font-size: 11px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Invoice No:</span>
          <span class="bold">${invoiceNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Date:</span>
          <span>${formatDate(sale.date)} ${formatTime(sale.date)}</span>
        </div>
        ${sale.customer ? `
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between;">
          <span>Customer:</span>
          <span class="bold">${customerName}</span>
        </div>
        ${customerCode ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Code:</span>
          <span>#${customerCode}</span>
        </div>` : ''}
        ${customerPhone ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Phone:</span>
          <span>${customerPhone}</span>
        </div>` : ''}
        ` : ''}
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
          <span>${currency} ${subtotal.toFixed(2)}</span>
        </div>
        ${gstAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>GST (${gstRate}%):</span>
          <span>${currency} ${gstAmount.toFixed(2)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
          <span>Grand Total:</span>
          <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="divider"></div>
      <div style="font-size: 11px;">
        ${paymentDetailsHtml}
      </div>

      <div class="divider"></div>
      <div class="text-center" style="font-size: 10px; color: #666; margin-top: 6px;">
        ${isCredit ? `
        <div>Payment is due within the agreed credit term.</div>
        <div style="margin-top: 3px; font-weight: bold;">Thank you for your business!</div>
        ` : `
        <div>Thank you for shopping with us!</div>
        <div style="margin-top: 3px; font-weight: bold;">Please visit us again soon.</div>
        `}
      </div>
    </body>
    </html>
  `;

  printContent(html, settings);
};

/**
 * A4 Clean Minimalist Invoice PDF (Matching Quotation A4 Style)
 */
export const downloadSaleA4Pdf = (sale: Sale, settings: AppSettings) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const shop = (settings?.shop || {}) as Partial<AppSettings['shop']>;
  const currency = shop.currency || 'MVR';
  const shopName = shop.shopName || 'MVPOS Store';
  const shopAddress = shop.shopAddress || shop.address || '';
  const shopPhone = shop.shopPhone || shop.contactNumber || shop.phone || '';
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '1021550GST501';
  const shopLogo = shop.logo || '';

  const isCredit = sale.paymentMethod === 'credit' || (sale.balance !== undefined && sale.balance > 0);
  const invoiceTitle = isCredit ? 'CREDIT INVOICE' : 'TAX INVOICE';
  const invoiceNumber = sale.invoiceNumber || sale.id;

  const customerName = sale.customer?.name_en || sale.customer?.name_dv || 'General Customer';
  const customerPhone = sale.customer?.phone || '';
  const customerCode = sale.customer?.code || '';

  const gstRate = Number(shop.taxRate) || 0;
  const subtotal = gstRate > 0 ? sale.grandTotal / (1 + gstRate / 100) : sale.grandTotal;
  const gstAmount = sale.grandTotal - subtotal;

  const paidAmount = Number(sale.paidAmount) || (isCredit ? 0 : sale.grandTotal);
  const balanceDue = isCredit ? Math.max(0, sale.grandTotal - paidAmount) : 0;
  const changeGiven = !isCredit && paidAmount > sale.grandTotal ? paidAmount - sale.grandTotal : 0;

  // ==========================================
  // 1. TOP ACCENT LINE & CLEAN WHITE HEADER
  // ==========================================
  // Subtle top accent bar (2.5mm clean sky blue)
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

  // Right Side: Invoice Title (Clean Ocean Blue) & Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text(invoiceTitle, 196, 16, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice: ${invoiceNumber}`, 196, 22.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(sale.date)} ${formatTime(sale.date)}`, 196, 28, { align: 'right' });

  // Clean Subtle Header Separator Line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  doc.line(14, 35, 196, 35);

  // ==========================================
  // 2. CLIENT & INVOICE DETAILS
  // ==========================================
  const detailsY = 43;

  // Left: Customer Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('INVOICE ISSUED TO:', 14, detailsY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(customerName.toUpperCase(), 14, detailsY + 6.5);

  const customerMeta = [
    customerCode ? `Code: #${customerCode}` : '',
    customerPhone ? `Phone: ${customerPhone}` : '',
  ].filter(Boolean).join('   |   ');
  if (customerMeta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(customerMeta, 14, detailsY + 12.5);
  }

  // Right: Payment & Status Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT DETAILS:', 135, detailsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Method:', 135, detailsY + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text((sale.paymentMethod || 'CASH').toUpperCase(), 196, detailsY + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Status:', 135, detailsY + 12.5);
  doc.setFont('helvetica', 'bold');
  if (isCredit && balanceDue > 0) {
    doc.setTextColor(217, 119, 6); // Amber-600
    doc.text('CREDIT (BALANCE DUE)', 196, detailsY + 12.5, { align: 'right' });
  } else {
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text('PAID IN FULL', 196, detailsY + 12.5, { align: 'right' });
  }

  // ==========================================
  // 3. CLEAN ITEMS TABLE
  // ==========================================
  const tableRows = sale.items.map((item, idx) => {
    const unitTag = item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : '';
    const flavourTag = item.selected_flavour ? ` [${item.selected_flavour}]` : '';
    const name = `${item.name_en || item.name_dv || 'Item'}${flavourTag}${unitTag}`;
    return [
      idx + 1,
      name,
      item.qty,
      `${currency} ${Number(item.price).toFixed(2)}`,
      `${currency} ${(Number(item.price) * Number(item.qty)).toFixed(2)}`,
    ];
  });

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
  // 4. FINANCIAL SUMMARY & PAYMENT STATUS
  // ==========================================
  const summaryX = 135;
  let currentY = finalY;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', summaryX, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} ${subtotal.toFixed(2)}`, 196, currentY + 4, { align: 'right' });
  currentY += 6;

  if (gstAmount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`GST (${gstRate}%):`, summaryX, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${currency} ${gstAmount.toFixed(2)}`, 196, currentY + 4, { align: 'right' });
    currentY += 6;
  }

  // Divider Line before Total
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(summaryX, currentY + 3, 196, currentY + 3);
  currentY += 8;

  // Grand Total Line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX, currentY + 1);

  doc.setFontSize(11.5);
  doc.setTextColor(2, 132, 199); // Sky-600
  doc.text(`${currency} ${sale.grandTotal.toFixed(2)}`, 196, currentY + 1, { align: 'right' });
  currentY += 7;

  // Payment Breakdown
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Paid Amount:', summaryX, currentY + 1);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} ${paidAmount.toFixed(2)}`, 196, currentY + 1, { align: 'right' });
  currentY += 6;

  if (isCredit && balanceDue > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text('Balance Due:', summaryX, currentY + 1);
    doc.text(`${currency} ${balanceDue.toFixed(2)}`, 196, currentY + 1, { align: 'right' });
    currentY += 6;
  } else if (changeGiven > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Change Given:', summaryX, currentY + 1);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // Emerald-600
    doc.text(`${currency} ${changeGiven.toFixed(2)}`, 196, currentY + 1, { align: 'right' });
    currentY += 6;
  }

  // Terms & Conditions (Left)
  const termsText = isCredit
    ? 'Payment is due within the agreed credit term. Please settle the balance before the due date.'
    : 'Thank you for your business! Goods once sold can be exchanged within 3 days with original receipt.';

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TERMS & NOTES:', 14, finalY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const splitTerms = doc.splitTextToSize(termsText, 105);
  doc.text(splitTerms, 14, finalY + 9.5);

  // ==========================================
  // 5. SIGNATURE & GENERATION LINE
  // ==========================================
  const afterTotalY = Math.max(currentY, finalY + 22) + 6;

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

  doc.save(`${isCredit ? 'CreditInvoice' : 'Invoice'}_${invoiceNumber}.pdf`);
};

/**
 * A4 HTML Printing (Exact layout matching the PDF, for direct browser / silent printing)
 */
export const printSaleA4Html = (sale: Sale, settings: AppSettings) => {
  const shop = (settings?.shop || {}) as Partial<AppSettings['shop']>;
  const currency = shop.currency || 'MVR';
  const shopName = shop.shopName || 'MVPOS Store';
  const shopAddress = shop.shopAddress || shop.address || '';
  const shopPhone = shop.shopPhone || shop.contactNumber || shop.phone || '';
  const shopTin = shop.tinNumber || shop.tin || shop.taxNumber || settings?.accounting?.tinNumber || '1021550GST501';
  const shopLogo = shop.logo || '';

  const isCredit = sale.paymentMethod === 'credit' || (sale.balance !== undefined && sale.balance > 0);
  const invoiceTitle = isCredit ? 'CREDIT INVOICE' : 'TAX INVOICE';
  const invoiceNumber = sale.invoiceNumber || sale.id;

  const customerName = sale.customer?.name_en || sale.customer?.name_dv || 'General Customer';
  const customerPhone = sale.customer?.phone || '';
  const customerCode = sale.customer?.code || '';

  const gstRate = Number(shop.taxRate) || 0;
  const subtotal = gstRate > 0 ? sale.grandTotal / (1 + gstRate / 100) : sale.grandTotal;
  const gstAmount = sale.grandTotal - subtotal;

  const paidAmount = Number(sale.paidAmount) || (isCredit ? 0 : sale.grandTotal);
  const balanceDue = isCredit ? Math.max(0, sale.grandTotal - paidAmount) : 0;
  const changeGiven = !isCredit && paidAmount > sale.grandTotal ? paidAmount - sale.grandTotal : 0;

  const rowsHtml = sale.items.map((item, idx) => {
    const unitTag = item.selected_unit && item.selected_unit !== 'Piece' ? ` (${item.selected_unit})` : '';
    const flavourTag = item.selected_flavour ? ` [${item.selected_flavour}]` : '';
    const name = `${item.name_en || item.name_dv || 'Item'}${flavourTag}${unitTag}`;
    return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${name}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.qty}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${currency} ${Number(item.price).toFixed(2)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f172a;">${currency} ${(Number(item.price) * Number(item.qty)).toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${invoiceTitle} ${invoiceNumber}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 24px 32px;
          color: #0f172a;
          background: #ffffff;
          box-sizing: border-box;
          font-size: 13px;
          line-height: 1.4;
        }
        .top-stripe {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: #0284c7;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
          margin-top: 6px;
        }
        .shop-info {
          display: flex;
          gap: 14px;
          align-items: center;
        }
        .shop-logo {
          max-height: 48px;
          max-width: 120px;
          object-fit: contain;
        }
        .invoice-title-block {
          text-align: right;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: 900;
          color: #0284c7;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 18px 0;
        }
        .section-label {
          font-size: 10px;
          font-weight: bold;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        th {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: bold;
          font-size: 12px;
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .summary-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 10px;
        }
        .terms-block {
          width: 55%;
          color: #475569;
          font-size: 11px;
        }
        .financial-summary {
          width: 40%;
          text-align: right;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          font-size: 12px;
        }
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          font-weight: 900;
          color: #0284c7;
          padding: 6px 0;
          border-top: 1px solid #cbd5e1;
          margin-top: 4px;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 36px;
          padding-top: 12px;
        }
        .sig-line {
          width: 200px;
          border-top: 1px solid #cbd5e1;
          font-size: 10.5px;
          color: #64748b;
          padding-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="top-stripe"></div>
      
      <div class="header">
        <div class="shop-info">
          ${shopLogo ? `<img src="${shopLogo}" class="shop-logo" />` : ''}
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">${shopName.toUpperCase()}</div>
            ${shopAddress ? `<div style="font-size: 11px; color: #64748b;">${shopAddress}</div>` : ''}
            <div style="font-size: 11px; color: #64748b;">
              ${shopPhone ? `Tel: ${shopPhone}` : ''}
              ${shopPhone && shopTin ? ' | ' : ''}
              ${shopTin ? `TIN: ${shopTin}` : ''}
            </div>
          </div>
        </div>

        <div class="invoice-title-block">
          <div class="invoice-title">${invoiceTitle}</div>
          <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">Ref: ${invoiceNumber}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${formatDate(sale.date)} ${formatTime(sale.date)}</div>
        </div>
      </div>

      <div class="details-grid">
        <div>
          <div class="section-label">INVOICE ISSUED TO:</div>
          <div style="font-size: 14px; font-weight: bold;">${customerName.toUpperCase()}</div>
          ${customerCode ? `<div style="font-size: 11px; color: #64748b;">Code: #${customerCode}</div>` : ''}
          ${customerPhone ? `<div style="font-size: 11px; color: #64748b;">Phone: ${customerPhone}</div>` : ''}
        </div>

        <div style="text-align: right;">
          <div class="section-label">PAYMENT DETAILS:</div>
          <div style="font-size: 13px; font-weight: bold;">Method: ${(sale.paymentMethod || 'CASH').toUpperCase()}</div>
          <div style="font-size: 12px; font-weight: bold; color: ${isCredit && balanceDue > 0 ? '#d97706' : '#059669'};">
            ${isCredit && balanceDue > 0 ? 'CREDIT (BALANCE DUE)' : 'PAID IN FULL'}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th style="text-align: left;">Item Description</th>
            <th style="width: 60px; text-align: center;">Qty</th>
            <th style="width: 100px; text-align: right;">Unit Price</th>
            <th style="width: 110px; text-align: right;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="summary-container">
        <div class="terms-block">
          <div class="section-label">TERMS &amp; CONDITIONS:</div>
          <div>${isCredit ? 'Payment is due within the agreed credit term.' : 'Thank you for your business! Goods once sold can be exchanged within 3 days with original receipt.'}</div>
        </div>

        <div class="financial-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span style="font-weight: bold;">${currency} ${subtotal.toFixed(2)}</span>
          </div>
          ${gstAmount > 0 ? `
          <div class="summary-row">
            <span>GST (${gstRate}%):</span>
            <span style="font-weight: bold;">${currency} ${gstAmount.toFixed(2)}</span>
          </div>` : ''}
          <div class="grand-total-row">
            <span>Grand Total:</span>
            <span>${currency} ${sale.grandTotal.toFixed(2)}</span>
          </div>
          <div class="summary-row" style="margin-top: 4px;">
            <span>Paid Amount:</span>
            <span style="font-weight: bold;">${currency} ${paidAmount.toFixed(2)}</span>
          </div>
          ${isCredit && balanceDue > 0 ? `
          <div class="summary-row" style="color: #dc2626; font-weight: bold;">
            <span>Balance Due:</span>
            <span>${currency} ${balanceDue.toFixed(2)}</span>
          </div>` : ''}
          ${changeGiven > 0 ? `
          <div class="summary-row" style="color: #059669; font-weight: bold;">
            <span>Change Given:</span>
            <span>${currency} ${changeGiven.toFixed(2)}</span>
          </div>` : ''}
        </div>
      </div>

      <div class="footer-signatures">
        <div class="sig-line">
          Authorized Signature &amp; Stamp
        </div>
        <div style="font-size: 10px; color: #94a3b8;">
          Generated on ${new Date().toLocaleDateString()} | ${shopName}
        </div>
      </div>
    </body>
    </html>
  `;

  printContent(html, settings);
};
