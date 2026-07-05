// ══════════════════════════════════════════════
//  RemoteAI — Resume PDF Export
//  Builds a clean, single-column, ATS-friendly PDF
//  directly from the resume data structure using
//  jsPDF's native text API (no html2canvas / image
//  rasterization — every word stays real, selectable
//  text so ATS parsers can read it correctly).
// ══════════════════════════════════════════════

import { jsPDF } from 'jspdf';

// Per-template accent color for headings / the rule under the name.
// Kept subtle on purpose — a colored heading is still 100% parseable
// text, but the "Simple ATS" template stays pure black & white as
// some ATS-focused advice recommends avoiding color entirely.
const TEMPLATE_ACCENT = {
  developer: [79, 70, 229],   // indigo
  modern:    [219, 39, 119],  // pink
  ats:       [0, 0, 0],       // pure black
};

const PAGE = { width: 210, height: 297 };     // A4, mm
const MARGIN = 18;                             // mm
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

function safe(str) {
  return (str || '').toString().trim();
}

function joined(list, sep = '  •  ') {
  return list.filter(Boolean).join(sep);
}

export function downloadResumePDF(resume, filename) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const accent = TEMPLATE_ACCENT[resume.template] || TEMPLATE_ACCENT.developer;

  let y = MARGIN;

  const ensureSpace = (needed) => {
    if (y + needed > PAGE.height - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text) => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...accent);
    doc.text(text.toUpperCase(), MARGIN, y);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y + 1.3, PAGE.width - MARGIN, y + 1.3);
    doc.setTextColor(20, 20, 20);
    y += 6.5;
  };

  const paragraph = (text, size = 10, lineHeight = 4.6) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    lines.forEach(line => {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN, y);
      y += lineHeight;
    });
  };

  const bulletList = (rawText) => {
    const lines = safe(rawText)
      .split(/\r?\n/)
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    lines.forEach(line => {
      const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH - 5);
      wrapped.forEach((w, i) => {
        ensureSpace(4.6);
        doc.text(i === 0 ? `•  ${w}` : `    ${w}`, MARGIN, y);
        y += 4.6;
      });
    });
  };

  const entryRow = (left, right) => {
    ensureSpace(5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text(left, MARGIN, y);
    if (right) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(90, 90, 90);
      doc.text(right, PAGE.width - MARGIN, y, { align: 'right' });
    }
    y += 5.2;
  };

  const subLine = (text) => {
    if (!text) return;
    ensureSpace(4.6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(text, MARGIN, y);
    y += 4.6;
  };

  // ── Header: Name + Role ──
  const p = resume.personalInfo || {};
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 15, 15);
  doc.text(safe(p.fullName) || 'Your Name', MARGIN, y);
  y += 7;

  if (resume.targetRole) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(resume.targetRole, MARGIN, y);
    y += 6;
  }

  // ── Contact Information ──
  const contact = joined([p.email, p.location, p.linkedin, p.github, p.website]);
  if (contact) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    const contactLines = doc.splitTextToSize(contact, CONTENT_WIDTH);
    contactLines.forEach(line => { doc.text(line, MARGIN, y); y += 4.4; });
  }

  y += 1;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE.width - MARGIN, y);
  y += 6;

  // ── Professional Summary ──
  if (safe(resume.summary)) {
    heading('Summary');
    paragraph(resume.summary);
    y += 3;
  }

  // ── Skills (clean grouped layout) ──
  const skillGroups = [
    ['Languages', resume.skills?.languages],
    ['Frameworks', resume.skills?.frameworks],
    ['Databases', resume.skills?.databases],
    ['Tools', resume.skills?.tools],
  ].filter(([, list]) => list && list.length);

  if (skillGroups.length) {
    heading('Skills');
    skillGroups.forEach(([label, list]) => {
      ensureSpace(4.8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`${label}:`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const labelWidth = doc.getTextWidth(`${label}:  `);
      const wrapped = doc.splitTextToSize(list.join(', '), CONTENT_WIDTH - labelWidth);
      doc.text(wrapped[0] || '', MARGIN + labelWidth, y);
      y += 4.8;
      for (let i = 1; i < wrapped.length; i++) {
        ensureSpace(4.6);
        doc.text(wrapped[i], MARGIN + labelWidth, y);
        y += 4.6;
      }
    });
    y += 2;
  }

  // ── Experience ──
  if (resume.experience?.length) {
    heading('Experience');
    resume.experience.forEach(exp => {
      const left = [exp.role, exp.company].filter(Boolean).join(' — ') || 'Role';
      entryRow(left, exp.duration);
      if (exp.responsibilities) bulletList(exp.responsibilities);
      y += 3;
    });
  }

  // ── Projects ──
  if (resume.projects?.length) {
    heading('Projects');
    resume.projects.forEach(proj => {
      entryRow(proj.name || 'Project', proj.link);
      if (proj.tech) subLine(proj.tech);
      if (proj.description) paragraph(proj.description, 9.5, 4.4);
      y += 3;
    });
  }

  // ── Education ──
  if (resume.education?.length) {
    heading('Education');
    resume.education.forEach(ed => {
      const left = [ed.degree, ed.school].filter(Boolean).join(' — ') || 'Degree';
      entryRow(left, ed.year);
    });
    y += 2;
  }

  // ── Certifications ──
  if (resume.certifications?.length) {
    heading('Certifications');
    resume.certifications.forEach(c => {
      const left = [c.name, c.issuer].filter(Boolean).join(' — ') || 'Certification';
      entryRow(left, c.year);
    });
  }

  const safeName = (safe(p.fullName) || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  doc.save(filename || `${safeName || 'resume'}-resume.pdf`);
}
