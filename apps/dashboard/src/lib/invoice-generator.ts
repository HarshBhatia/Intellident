import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Patient, Visit, ClinicInfo, BillingItem } from '@/types';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

// Derive whether CGST+SGST (intra-state) or IGST (inter-state) applies.
// Compares first 2 digits of GSTIN (state code). Fallback: intra-state.
function taxSplit(clinicGstin: string, patientStateCode?: string): 'intra' | 'inter' {
  if (!patientStateCode || !clinicGstin || clinicGstin.length < 2) return 'intra';
  return clinicGstin.substring(0, 2) === patientStateCode.substring(0, 2) ? 'intra' : 'inter';
}

export interface InvoiceData {
  clinic: ClinicInfo;
  patient: Patient;
  visit: Visit;
  invoiceNumber: number;
  patientStateCode?: string;
}

export function generateInvoicePDF({ clinic, patient, visit, invoiceNumber, patientStateCode }: InvoiceData): void {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const gstRate = clinic.gst_rate ?? 18;
  const isInter = taxSplit(clinic.gstin || '', patientStateCode) === 'inter';

  // ── Parse billing items ──────────────────────────────────────────────────
  let items: BillingItem[] = [];
  if (visit.billing_items) {
    if (Array.isArray(visit.billing_items)) {
      items = visit.billing_items;
    } else {
      try { items = JSON.parse(visit.billing_items as unknown as string) || []; } catch { items = []; }
    }
  }

  // If no billing items, create one from the total cost
  if (items.length === 0 && visit.cost) {
    items = [{ description: visit.visit_type || 'Dental treatment', amount: Number(visit.cost) }];
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => {
    const lineAmt = i.unit_price != null && i.qty != null
      ? i.unit_price * i.qty
      : Number(i.amount || 0);
    return s + lineAmt;
  }, 0);

  const taxAmt = Math.round((subtotal * gstRate) / 100 * 100) / 100;
  const halfTax = Math.round(taxAmt / 2 * 100) / 100;
  const total = subtotal + taxAmt;

  const invoiceId = `INV-${String(invoiceNumber).padStart(4, '0')}`;
  const invoiceDate = visit.date ? fmtDate(visit.date) : fmtDate(new Date().toISOString().split('T')[0]);

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pw, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(clinic.clinic_name || 'Dental Clinic', 15, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const subline = [clinic.address, clinic.phone ? `Ph: ${clinic.phone}` : '', clinic.email].filter(Boolean).join('  |  ');
  doc.text(subline, 15, 22, { maxWidth: pw - 30 });

  if (clinic.gstin) doc.text(`GSTIN: ${clinic.gstin}`, 15, 30);
  if (clinic.pan)   doc.text(`PAN: ${clinic.pan}`, 15 + (clinic.gstin ? 70 : 0), 30);

  // ── Invoice title ────────────────────────────────────────────────────────
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pw - 15, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceId, pw - 15, 30, { align: 'right' });

  // ── Bill-to + meta ───────────────────────────────────────────────────────
  let y = 48;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, pw - 30, 32, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(15, y, pw - 30, 32, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', 20, y + 7);
  doc.text('INVOICE DATE', pw / 2 + 10, y + 7);
  doc.text('PATIENT ID', pw / 2 + 60, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(patient.name, 20, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (patient.phone_number) doc.text(`Ph: ${patient.phone_number}`, 20, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoiceDate, pw / 2 + 10, y + 15);
  doc.text(patient.patient_id, pw / 2 + 60, y + 15);

  y += 42;

  // ── Line items table ─────────────────────────────────────────────────────
  const tableBody = items.map((item, idx) => {
    const qty  = item.qty ?? 1;
    const rate = item.unit_price ?? Number(item.amount || 0);
    const lineTotal = item.unit_price != null && item.qty != null ? item.unit_price * item.qty : Number(item.amount || 0);
    return [
      idx + 1,
      item.description,
      item.hsn_code || '9997',  // HSN 9997 = other services (dental)
      qty,
      `₹${fmt(rate)}`,
      `₹${fmt(lineTotal)}`,
    ];
  });

  (doc as any).autoTable({
    startY: y,
    head: [['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Tax summary box ──────────────────────────────────────────────────────
  const boxX = pw / 2 + 5;
  const boxW = pw / 2 - 20;

  const rows: [string, string][] = [
    ['Subtotal (excl. GST)', `₹${fmt(subtotal)}`],
    ...(isInter
      ? [[`IGST @ ${gstRate}%`, `₹${fmt(taxAmt)}`] as [string, string]]
      : [
          [`CGST @ ${gstRate / 2}%`, `₹${fmt(halfTax)}`] as [string, string],
          [`SGST @ ${gstRate / 2}%`, `₹${fmt(halfTax)}`] as [string, string],
        ]),
  ];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(boxX, y, boxW, 6 + rows.length * 8 + 14, 2, 2, 'FD');

  let ry = y + 7;
  doc.setFontSize(8.5);
  for (const [label, val] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(label, boxX + 5, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(val, boxX + boxW - 5, ry, { align: 'right' });
    ry += 8;
  }

  // Total row
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(boxX, ry - 2, boxW, 12, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Total Payable', boxX + 5, ry + 6);
  doc.text(`₹${fmt(total)}`, boxX + boxW - 5, ry + 6, { align: 'right' });

  // ── Payment status ───────────────────────────────────────────────────────
  const paid = Number(visit.paid || 0);
  const due  = total - paid;

  if (paid > 0) {
    ry += 16;
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paid: ₹${fmt(paid)}  |  Balance due: ₹${fmt(Math.max(0, due))}`, boxX + 5, ry);
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  if (visit.procedure_notes) {
    const noteY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('NOTES', 15, noteY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const split = doc.splitTextToSize(visit.procedure_notes, pw / 2 - 20);
    doc.text(split, 15, noteY + 6);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.line(15, ph - 22, pw - 15, ph - 22);
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated invoice and does not require a physical signature.', pw / 2, ph - 16, { align: 'center' });
  doc.text(`Generated by IntelliDent  |  ${clinic.clinic_name}  |  ${invoiceId}`, pw / 2, ph - 10, { align: 'center' });

  const fileName = `Invoice_${invoiceId}_${patient.name.replace(/\s+/g, '_')}_${visit.date || 'unknown'}.pdf`;
  doc.save(fileName);
}
