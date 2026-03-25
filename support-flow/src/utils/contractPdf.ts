// src/utils/contractPdf.ts
// npm install jspdf

import { jsPDF } from 'jspdf';

export interface ContractData {
  orgName: string;
  orgEmail: string;
  orgPhone?: string;
  orgAddress?: string;
  orgType: string;
  adminName: string;
  adminEmail: string;
  plan: string;
  contractEndDate?: string;
  contractStatus?: string;
  createdAt: string;
}

// ⚠️ Purely SYNCHRONOUS — no async, no Promise, call it directly
export function generateContractPDF(data: ContractData): { blob: Blob; url: string } {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Header ───────────────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRACT AGREEMENT', pageW / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('Organization Subscription Contract', pageW / 2, 28, { align: 'center' });

  const contractId = `CTR-${data.orgEmail.split('@')[0].toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Contract ID: ${contractId}`, 14, 36);
  doc.text(`Issued: ${new Date(data.createdAt).toLocaleDateString('en-GB')}`, pageW - 14, 36, { align: 'right' });

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(14, 43, pageW - 14, 43);

  let y = 52;

  const sectionTitle = (title: string) => {
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, y - 5, pageW - 28, 9, 2, 2, 'F');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 18, y + 1);
    y += 10;
  };

  const row = (label: string, value: string, highlight = false) => {
    if (highlight) {
      doc.setFillColor(238, 242, 255);
      doc.rect(14, y - 4, pageW - 28, 7, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text(label, 18, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.text(value || '—', 80, y);
    y += 8;
  };

  // ── Section 1 ────────────────────────────────────────────────────────────────
  sectionTitle('Organization Details');
  row('Company Name', data.orgName, true);
  row('Type', data.orgType === 'physique' ? 'Sole Proprietor (Physique)' : 'Corporation (Morale)');
  row('Email', data.orgEmail, true);
  if (data.orgPhone)   row('Phone',   data.orgPhone);
  if (data.orgAddress) row('Address', data.orgAddress, true);
  y += 4;

  // ── Section 2 ────────────────────────────────────────────────────────────────
  sectionTitle('Administrator Account');
  row('Full Name', data.adminName, true);
  row('Email',     data.adminEmail);
  y += 4;

  // ── Section 3 ────────────────────────────────────────────────────────────────
  sectionTitle('Subscription & Contract Terms');

  if (data.contractStatus) {
    const statusColors: Record<string, [number, number, number]> = {
      active: [16, 185, 129], trial: [59, 130, 246], suspended: [245, 158, 11], expired: [239, 68, 68],
    };
    const [sr, sg, sb] = statusColors[data.contractStatus] ?? [107, 114, 128];
    doc.setFillColor(sr, sg, sb);
    doc.roundedRect(80, y - 4.5, 24, 7, 3.5, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(data.contractStatus.toUpperCase(), 92, y, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Contract Status', 18, y);
    y += 8;
  }

  const planColors: Record<string, [number, number, number]> = {
    basic: [59, 130, 246], pro: [99, 102, 241], enterprise: [16, 185, 129],
  };
  const [pr, pg, pb] = planColors[data.plan] ?? [107, 114, 128];
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(80, y - 4.5, 24, 7, 3.5, 3.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.plan.toUpperCase(), 92, y, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Subscription Plan', 18, y);
  y += 8;

  row('Contract Start', new Date(data.createdAt).toLocaleDateString('en-GB'), true);
  row('Contract Expiry', data.contractEndDate ? new Date(data.contractEndDate).toLocaleDateString('en-GB') : 'No expiry (Open-ended)', true);
  y += 6;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageW - 14, y);
  y += 8;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  [
    "By activating this subscription, the organization agrees to the platform's Terms of Service and Privacy Policy.",
    'The subscription grants access to platform features according to the selected plan. Services may be upgraded,',
    'downgraded, or cancelled with 30 days written notice. All data remains the property of the organization.',
  ].forEach(line => { doc.text(line, 14, y); y += 5; });
  y += 6;

  // ── Signatures ────────────────────────────────────────────────────────────────
  sectionTitle('Signatures');
  y += 2;
  const sigY = y;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(18, sigY + 14, 85, sigY + 14);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Platform Representative', 18, sigY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Authorized Signatory', 18, sigY + 24);
  doc.line(pageW - 85, sigY + 14, pageW - 18, sigY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(data.adminName, pageW - 85, sigY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Admin — ${data.orgName}`, pageW - 85, sigY + 24);

  // ── Footer ────────────────────────────────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.setFont('helvetica', 'normal');
  doc.text('This document is auto-generated and serves as an official contract record.', pageW / 2, pageH - 7, { align: 'center' });
  doc.text(`Contract ID: ${contractId}`, 14, pageH - 4);
  doc.text('Page 1 of 1', pageW - 14, pageH - 4, { align: 'right' });

  // ✅ Return blob directly — no Promise, no await needed
  const blob = doc.output('blob');
  const url  = URL.createObjectURL(blob);
  return { blob, url };
}

export function downloadPDF(blob: Blob, orgName: string): void {
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `Contract_${orgName.replace(/\s+/g, '_')}.pdf`;
  a.click();
}
