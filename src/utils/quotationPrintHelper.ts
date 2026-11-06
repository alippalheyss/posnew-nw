import { Quotation, AppSettings } from '@/context/AppContext';
import { printViaIframe } from '@/utils/printHelper';
import { formatDate, formatTime } from '@/utils/formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * 80mm Thermal Slip for Quotations (އަންދާސީ ހިސާބު)
 */
export const printQuotation80mm = (quotation: Quotation, settings: AppSettings) => {
  const currency = settings.shop.currency || 'MVR';
  const shopName = settings.shop.shopName || 'MVPOS Store';
  const shopContact = settings.shop.contactNumber || '';
  const shopAddress = settings.shop.address || '';
  const shopTin = settings.shop.tinNumber || (settings.shop as any).tin || '';

  const customerName = quotation.customer?.name_en || quotation.customer?.name_dv || quotation.customer_name || 'Valued Customer / އާންމު ކަސްޓަމަރު';
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
    <html dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>Quotation ${quotation.quotation_number}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Faruma', 'MV Boli', Tahoma, sans-serif;
          width: 72mm;
          margin: 0 auto;
          padding: 8px 4px;
          color: #000;
          line-height: 1.3;
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
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin: 0 0 2px 0; font-size: 16px; font-weight: 900;">${shopName}</h2>
        ${shopAddress ? `<div style="font-size: 10px;">${shopAddress}</div>` : ''}
        ${shopContact ? `<div style="font-size: 10px;">Tel: ${shopContact}</div>` : ''}
        ${shopTin ? `<div style="font-size: 10px;">TIN: ${shopTin}</div>` : ''}
      </div>

      <div class="banner">
        <div>QUOTATION / އަންދާސީ ހިސާބު</div>
        <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">*** NOT A TAX INVOICE ***</div>
      </div>

      <div style="font-size: 10px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between;">
          <span>ކޯޓޭޝަން ނަންބަރު:</span>
          <span class="bold" dir="ltr">${quotation.quotation_number}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>ތާރީޚް:</span>
          <span dir="ltr">${formatDate(quotation.date)} ${formatTime(quotation.date)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>ބަލައިގަންނާނެ އެންމެ ފަހު ތާރީޚް:</span>
          <span class="bold" dir="ltr">${formatDate(quotation.valid_until)}</span>
        </div>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between;">
          <span>ކަސްޓަމަރު:</span>
          <span class="bold">${customerName}</span>
        </div>
        ${customerPhone ? `
        <div style="display: flex; justify-content: space-between;">
          <span>ފޯނު:</span>
          <span dir="ltr">${customerPhone}</span>
        </div>` : ''}
      </div>

      <div class="divider"></div>
      <div style="font-size: 10px; font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>ތަކެތި (Description)</span>
        <span>އަގު (${currency})</span>
      </div>
      <div class="divider"></div>

      ${itemsHtml}

      <div class="divider"></div>

      <div style="font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>ސަބްޓޯޓަލް (Subtotal):</span>
          <span dir="ltr">${currency} ${quotation.subtotal.toFixed(2)}</span>
        </div>
        ${quotation.tax_amount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
          <span>ޖީ.އެސް.ޓީ (GST ${settings.shop.taxRate}%):</span>
          <span dir="ltr">${currency} ${quotation.tax_amount.toFixed(2)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;">
          <span>ޖުމްލަ (Grand Total):</span>
          <span dir="ltr">${currency} ${quotation.grand_total.toFixed(2)}</span>
        </div>
      </div>

      ${quotation.notes ? `
      <div class="divider"></div>
      <div style="font-size: 9px; color: #444;">
        <strong>ނޯޓް:</strong> ${quotation.notes}
      </div>` : ''}

      <div class="divider"></div>
      <div class="text-center" style="font-size: 9px; color: #666; margin-top: 6px;">
        <div>މިއީ އަންދާސީ ހިސާބެކެވެ. މުދާ ދޫކުރެވޭނީ ސްޓޮކް ހުރި މިންވަރަކުންނެވެ.</div>
        <div style="margin-top: 2px;">Thank you for your business!</div>
      </div>
    </body>
    </html>
  `;

  printViaIframe(html);
};

/**
 * A4 Professional PDF Generator for Quotations
 */
export const downloadQuotationA4Pdf = (quotation: Quotation, settings: AppSettings) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const currency = settings.shop.currency || 'MVR';
  const shopName = settings.shop.shopName || 'MVPOS Store';
  const shopAddress = settings.shop.address || '';
  const shopPhone = settings.shop.contactNumber || '';
  const shopTin = settings.shop.tinNumber || (settings.shop as any).tin || '';

  const customerName = quotation.customer?.name_en || quotation.customer?.name_dv || quotation.customer_name || 'Valued Customer';
  const customerPhone = quotation.customer?.phone || quotation.customer_phone || '';

  // Header Box
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Shop Name & Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(shopName.toUpperCase(), 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  const headerDetails = [
    shopAddress,
    shopPhone ? `Phone: ${shopPhone}` : '',
    shopTin ? `Shop TIN: ${shopTin}` : '',
  ].filter(Boolean).join('  |  ');
  doc.text(headerDetails, 14, 26);

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
  doc.setFontSize(9);

  // Customer Info (Left)
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION ISSUED TO:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(customerName, 14, 54);
  if (customerPhone) doc.text(`Phone: ${customerPhone}`, 14, 60);

  // Quote Info (Right)
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION DETAILS:', 140, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quotation Date: ${formatDate(quotation.date)}`, 140, 54);
  doc.text(`Valid Until: ${formatDate(quotation.valid_until)}`, 140, 60);
  doc.text(`Status: ${quotation.status.toUpperCase()}`, 140, 66);

  // Items Table
  const tableRows = quotation.items.map((item, idx) => [
    idx + 1,
    item.name_en || item.name_dv || 'Item',
    item.barcode || item.item_code || '-',
    item.qty,
    `${currency} ${Number(item.price).toFixed(2)}`,
    `${currency} ${(Number(item.price) * Number(item.qty)).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['#', 'Item Description', 'Barcode / Code', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Financial Summary Box (Right)
  const summaryX = 130;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, finalY);
  doc.text(`${currency} ${quotation.subtotal.toFixed(2)}`, 196, finalY, { align: 'right' });

  if (quotation.tax_amount > 0) {
    doc.text(`GST (${settings.shop.taxRate}%):`, summaryX, finalY + 6);
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

  doc.text(`Generated on ${new Date().toLocaleDateString()} | MVPOS`, 196, pageHeight - 15, { align: 'right' });

  doc.save(`Quotation_${quotation.quotation_number}.pdf`);
};

