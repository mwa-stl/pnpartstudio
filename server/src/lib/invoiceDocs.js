import PDFDocument from 'pdfkit';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
  AlignmentType, BorderStyle, WidthType,
} from 'docx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');

// The site's own brand palette (see admin/src/index.css), reused here so the
// invoice reads as the same studio, not a generic export.
const INK = '#0B0B0B';
const GRAPHITE = '#3A3A38';
const SLATE = '#8C8C86';
const RULE = '#D8D5CB';
const VERMILLION = '#E8340C';
const FOREST = '#1F6B4A';

const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;

function displayStatusText(status) {
  if (!status || status === 'pending' || status === 'Placed') return 'Placed';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'shipped') return 'Shipped';
  if (status === 'out_for_delivery') return 'Out for delivery';
  if (status === 'delivered') return 'Delivered';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
}

function statusColor(status) {
  const s = displayStatusText(status);
  if (s === 'Delivered') return FOREST;
  if (s === 'Cancelled' || s === 'Failed') return VERMILLION;
  return SLATE;
}

function invoiceFields(order) {
  const ref = order.referenceId || order.orderNo || String(order._id || '').slice(-8);
  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const customerName =
    order.customer?.name || order.customerName ||
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || '—';
  const addr = order.shippingAddress || {};
  const items = (order.items || []).map((it) => {
    const qty = Number(it.qty ?? it.quantity ?? 0);
    const price = Number(it.price ?? 0);
    return { name: it.title || it.name || 'Item', qty, price, total: qty * price };
  });
  const subtotal = Number(order.subTotal ?? order.totals?.subtotal ?? 0);
  const shipping = Number(order.shipping?.amount ?? order.totals?.shipping ?? 0);
  const tax = Number(order.tax ?? order.totals?.tax ?? 0);
  const discount = Array.isArray(order.discounts)
    ? order.discounts.reduce((s, d) => s + Number(d?.amount || 0), 0)
    : Number(order.totals?.discount || 0);
  const total = Number(order.total ?? order.totals?.grandTotal ?? 0);

  return {
    ref, date, customerName, addr, items, subtotal, shipping, tax, discount, total,
    email: order.customer?.email || addr.email || '',
    payment: (order.paymentMethod || '').toUpperCase() || '—',
    status: displayStatusText(order.status),
  };
}

// ---------------------------------------------------------------------
// PDF — pdfkit, laid out by hand (it has no flexbox/table primitive), using
// the studio's own Newsreader/Archivo brand fonts embedded from
// server/assets/fonts so it doesn't fall back to a generic system font.
// ---------------------------------------------------------------------
export function streamInvoicePdf(order, res) {
  const f = invoiceFields(order);
  const doc = new PDFDocument({ size: 'A4', margin: 56, bufferPages: true });

  doc.registerFont('Display', path.join(FONTS_DIR, 'Newsreader-SemiBold.ttf'));
  doc.registerFont('Display-Bold', path.join(FONTS_DIR, 'Newsreader-Bold.ttf'));
  doc.registerFont('Display-Regular', path.join(FONTS_DIR, 'Newsreader-Regular.ttf'));
  doc.registerFont('Body', path.join(FONTS_DIR, 'Archivo-Regular.ttf'));
  doc.registerFont('Body-Bold', path.join(FONTS_DIR, 'Archivo-Bold.ttf'));
  doc.registerFont('Body-SemiBold', path.join(FONTS_DIR, 'Archivo-SemiBold.ttf'));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${f.ref}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  const label = (text, x, y, opts = {}) =>
    doc.font('Body-SemiBold').fontSize(7.5).fillColor(SLATE)
      .text(text.toUpperCase(), x, y, { characterSpacing: 1.1, ...opts });

  const rule = (y) => doc.moveTo(left, y).lineTo(right, y).lineWidth(0.75).strokeColor(RULE).stroke();

  // --- Header ---
  doc.font('Display-Bold').fontSize(24).fillColor(INK).text('PnP Artstudio', left, 56);
  label('Invoice', left, 86);

  label('Order', right - 160, 56, { width: 160, align: 'right' });
  doc.font('Body-Bold').fontSize(11).fillColor(INK).text(f.ref, right - 160, 68, { width: 160, align: 'right' });
  doc.font('Body').fontSize(8.5).fillColor(GRAPHITE).text(f.date, right - 160, 84, { width: 160, align: 'right' });
  doc.font('Body-SemiBold').fontSize(7).fillColor(statusColor(f.status))
    .text(f.status.toUpperCase(), right - 160, 100, { width: 160, align: 'right', characterSpacing: 1 });

  rule(126);

  // --- Bill to / Payment ---
  const billY = 144;
  label('Bill to', left, billY);
  doc.font('Body-Bold').fontSize(10).fillColor(INK).text(f.customerName, left, billY + 14, { width: width * 0.55 });
  doc.font('Body').fontSize(8.5).fillColor(GRAPHITE)
    .text(f.email, left, doc.y + 2, { width: width * 0.55 })
    .text(f.addr.line1 || '', left, doc.y + 1, { width: width * 0.55 });
  if (f.addr.line2) doc.text(f.addr.line2, left, doc.y + 1, { width: width * 0.55 });
  doc.text([f.addr.city, f.addr.state, f.addr.postalCode].filter(Boolean).join(', '), left, doc.y + 1, { width: width * 0.55 });
  doc.text(f.addr.countryCode || '', left, doc.y + 1, { width: width * 0.55 });

  label('Payment', right - 160, billY, { width: 160, align: 'right' });
  doc.font('Body-SemiBold').fontSize(9.5).fillColor(INK).text(f.payment, right - 160, billY + 14, { width: 160, align: 'right' });

  // --- Items table ---
  let y = Math.max(doc.y, billY + 100) + 20;
  const colItem = left, colQty = left + width * 0.56, colPrice = left + width * 0.7, colTotal = left + width * 0.85;
  const colTotalW = right - colTotal;

  label('Item', colItem, y);
  label('Qty', colQty, y, { width: colPrice - colQty, align: 'right' });
  label('Price', colPrice, y, { width: colTotal - colPrice, align: 'right' });
  label('Total', colTotal, y, { width: colTotalW, align: 'right' });
  y += 14;
  rule(y);
  y += 10;

  doc.font('Body').fontSize(9.5).fillColor(GRAPHITE);
  f.items.forEach((it) => {
    const rowTop = y;
    doc.font('Body').fillColor(INK).text(it.name, colItem, rowTop, { width: colQty - colItem - 8 });
    const rowH = doc.heightOfString(it.name, { width: colQty - colItem - 8 });
    doc.font('Body').fillColor(GRAPHITE)
      .text(String(it.qty), colQty, rowTop, { width: colPrice - colQty, align: 'right' })
      .text(fmtUSD(it.price), colPrice, rowTop, { width: colTotal - colPrice, align: 'right' });
    doc.font('Body-SemiBold').fillColor(INK)
      .text(fmtUSD(it.total), colTotal, rowTop, { width: colTotalW, align: 'right' });
    y = rowTop + Math.max(rowH, 14) + 8;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).lineWidth(0.5).strokeColor(RULE).stroke();
  });

  // --- Totals ---
  y += 8;
  const totalsX = right - 200;
  const totalsW = 200;
  const totalRow = (lbl, val, opts = {}) => {
    doc.font(opts.bold ? 'Body-Bold' : 'Body').fontSize(opts.bold ? 11 : 9.5).fillColor(opts.bold ? INK : GRAPHITE)
      .text(lbl, totalsX, y, { width: totalsW * 0.5 });
    doc.font(opts.bold ? 'Body-Bold' : 'Body-SemiBold').fontSize(opts.bold ? 11 : 9.5).fillColor(opts.color || INK)
      .text(val, totalsX + totalsW * 0.5, y, { width: totalsW * 0.5, align: 'right' });
    y += opts.bold ? 20 : 16;
  };
  totalRow('Subtotal', fmtUSD(f.subtotal));
  if (f.discount) totalRow('Discount', `−${fmtUSD(f.discount)}`, { color: FOREST });
  totalRow('Shipping', fmtUSD(f.shipping));
  totalRow('Tax', fmtUSD(f.tax));
  doc.moveTo(totalsX, y).lineTo(right, y).lineWidth(1).strokeColor(INK).stroke();
  y += 8;
  totalRow('Total', fmtUSD(f.total), { bold: true, color: VERMILLION });

  // --- Footer ---
  doc.font('Display-Regular').fontSize(10).fillColor(SLATE)
    .text('Thank you for supporting handmade art.', left, y + 44, { width, align: 'center' });

  doc.end();
}

// ---------------------------------------------------------------------
// Word (.docx) — the `docx` package can't embed a font file (Word relies on
// the reader's own installed fonts), so this names actual widely-installed
// faces that echo the brand pairing instead: Georgia for headings mirrors
// Newsreader's own serif fallback stack, Calibri for body text is what most
// Word installs already default to.
// ---------------------------------------------------------------------
const DOCX_HEADING_FONT = 'Georgia';
const DOCX_BODY_FONT = 'Calibri';

function borderless() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };
}

function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    borders: opts.rule
      ? { ...borderless(), bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D8D5CB' } }
      : borderless(),
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: 'center',
    margins: { top: 80, bottom: 80, left: 0, right: 0 },
  });
}

function labelRun(text) {
  return new TextRun({ text: text.toUpperCase(), font: DOCX_BODY_FONT, size: 15, color: '8C8C86', bold: true, characterSpacing: 12 });
}
function bodyRun(text, opts = {}) {
  return new TextRun({ text, font: DOCX_BODY_FONT, size: opts.size || 20, color: opts.color || '3A3A38', bold: !!opts.bold });
}

export async function buildInvoiceDocxBuffer(order) {
  const f = invoiceFields(order);

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell([
            new Paragraph({ children: [new TextRun({ text: 'PnP Artstudio', font: DOCX_HEADING_FONT, size: 40, bold: true, color: '0B0B0B' })] }),
            new Paragraph({ children: [labelRun('Invoice')], spacing: { before: 60 } }),
          ], { width: 55 }),
          cell([
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [labelRun('Order')] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(f.ref, { bold: true, size: 24 })], spacing: { before: 40 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(f.date, { size: 18 })], spacing: { before: 20 } }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: f.status.toUpperCase(), font: DOCX_BODY_FONT, size: 15, bold: true, color: f.status === 'Delivered' ? '1F6B4A' : (f.status === 'Cancelled' || f.status === 'Failed' ? 'E8340C' : '8C8C86') })], spacing: { before: 60 } }),
          ], { width: 45 }),
        ],
      }),
    ],
  });

  const billTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell([
            new Paragraph({ children: [labelRun('Bill to')] }),
            new Paragraph({ children: [bodyRun(f.customerName, { bold: true, size: 21 })], spacing: { before: 60 } }),
            new Paragraph({ children: [bodyRun(f.email)], spacing: { before: 40 } }),
            new Paragraph({ children: [bodyRun(f.addr.line1 || '')] }),
            ...(f.addr.line2 ? [new Paragraph({ children: [bodyRun(f.addr.line2)] })] : []),
            new Paragraph({ children: [bodyRun([f.addr.city, f.addr.state, f.addr.postalCode].filter(Boolean).join(', '))] }),
            new Paragraph({ children: [bodyRun(f.addr.countryCode || '')] }),
          ], { width: 60 }),
          cell([
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [labelRun('Payment')] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(f.payment, { bold: true, size: 21 })], spacing: { before: 60 } }),
          ], { width: 40 }),
        ],
      }),
    ],
  });

  const itemRows = [
    new TableRow({
      children: [
        cell(new Paragraph({ children: [labelRun('Item')] }), { width: 46, rule: true }),
        cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [labelRun('Qty')] }), { width: 14, rule: true }),
        cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [labelRun('Price')] }), { width: 20, rule: true }),
        cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [labelRun('Total')] }), { width: 20, rule: true }),
      ],
    }),
    ...f.items.map((it) => new TableRow({
      children: [
        cell(new Paragraph({ children: [bodyRun(it.name)] }), { width: 46, rule: true }),
        cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(String(it.qty))] }), { width: 14, rule: true }),
        cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(fmtUSD(it.price))] }), { width: 20, rule: true }),
        cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(fmtUSD(it.total), { bold: true, color: '0B0B0B' })] }), { width: 20, rule: true }),
      ],
    })),
  ];
  const itemsTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: itemRows });

  const totalLine = (lbl, val, opts = {}) => new TableRow({
    children: [
      cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(lbl, { bold: opts.bold, size: opts.bold ? 22 : 19 })] }), { width: 70 }),
      cell(new Paragraph({ alignment: AlignmentType.RIGHT, children: [bodyRun(val, { bold: true, size: opts.bold ? 22 : 19, color: opts.color || '0B0B0B' })] }), { width: 30 }),
    ],
  });
  const totalsRows = [totalLine('Subtotal', fmtUSD(f.subtotal))];
  if (f.discount) totalsRows.push(totalLine('Discount', `−${fmtUSD(f.discount)}`, { color: '1F6B4A' }));
  totalsRows.push(totalLine('Shipping', fmtUSD(f.shipping)));
  totalsRows.push(totalLine('Tax', fmtUSD(f.tax)));
  totalsRows.push(totalLine('Total', fmtUSD(f.total), { bold: true, color: 'E8340C' }));
  const totalsTable = new Table({
    width: { size: 45, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.RIGHT,
    rows: totalsRows,
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
      children: [
        headerTable,
        new Paragraph({ spacing: { before: 300, after: 300 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D8D5CB' } } }),
        billTable,
        new Paragraph({ spacing: { before: 400, after: 200 } }),
        itemsTable,
        new Paragraph({ spacing: { before: 300, after: 100 } }),
        totalsTable,
        new Paragraph({
          spacing: { before: 600 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Thank you for supporting handmade art.', font: DOCX_HEADING_FONT, italics: true, size: 20, color: '8C8C86' })],
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
