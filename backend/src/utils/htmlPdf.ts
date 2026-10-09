import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const IMAGES_DIR = path.join(process.cwd(), 'assets', 'images');

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Template bodies reference static assets (e.g. the KKU logo) the same way
// the browser editor does — a root-relative path served by the frontend's
// public/ folder. Puppeteer's setContent() has no base URL to resolve that
// against, so root-relative image srcs are swapped for an inlined base64
// copy shipped with the backend instead (see assets/images/).
export function resolveStaticImages(html: string): string {
  return html.replace(/src="\/([a-zA-Z0-9_\-.]+\.(png|jpg|jpeg|gif|svg))"/g, (match, filename: string, ext: string) => {
    const filePath = path.join(IMAGES_DIR, filename);
    if (!fs.existsSync(filePath)) return match;
    const base64 = fs.readFileSync(filePath).toString('base64');
    return `src="data:${MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream'};base64,${base64}"`;
  });
}

// Mirrors the frontend's mergeTemplateToHtml (student/request/new/[typeId]/page.tsx)
// so the generated PDF renders the exact same markup the student reviewed in
// the live preview before submitting — same chip substitution, same
// untouched surrounding HTML/CSS (bold, centering, images, tables, ...).
export function mergeTemplateToHtml(body: string, vars: Record<string, string>): { html: string; missing: string[] } {
  const missing: string[] = [];
  let html = body.replace(
    /<span[^>]*data-var="(\{\{[^"]+\}\})"[^>]*>[^<]*<\/span>/g,
    (_match, token: string) => {
      if (token.startsWith('{{sig_')) return ''; // signature chips are handled separately, as the grid below
      const key = token.slice(2, -2);
      const value = vars[key];
      if (!value || value === '—') {
        missing.push(key);
        return '';
      }
      return escapeHtml(value);
    }
  );
  // The WYSIWYG editor leaves behind empty <p></p> / <p><br></p> paragraphs
  // from pressing Enter — each one still costs a full line-height of blank
  // space (here, and in the live preview too). Trailing ones in particular
  // push the signature grid just barely past the bottom of the page, which
  // bumps the *entire* grid to a fresh page (Chromium prints CSS grid/flex
  // containers as a single unbreakable unit) and leaves a large blank gap
  // behind — collapsing them keeps real spacing intact while recovering
  // that wasted room.
  html = html.replace(/(?:<p>\s*(?:<br\s*\/?>)?\s*<\/p>)+$/i, '');
  return { html, missing };
}

export function parseRequiredSigKeys(variablesJson: string | null): string[] {
  try {
    const vars: string[] = JSON.parse(variablesJson ?? '[]');
    return vars.filter(v => v.startsWith('{{sig_')).map(v => v.slice(2, -2));
  } catch {
    return [];
  }
}

const SIG_ROLE_LABELS: Record<string, string> = {
  sig_student: 'Student', sig_advisor: 'Advisor', sig_ir_staff: 'IR Staff', sig_dean: 'Dean',
};

// Same layout as the live preview's signature block: a row of up to 4 equal
// boxes, each a blank line to sign above (or the actual signature image once
// signed) with the signer's name, role, and a date placeholder beneath it.
export function buildSignatureGridHtml(
  requiredSigKeys: string[],
  entries: Record<string, { name?: string; imageUrl?: string }>
): string {
  if (requiredSigKeys.length === 0) return '';
  const cols = Math.min(requiredSigKeys.length, 4);
  const boxWidth = `${(100 / cols).toFixed(4)}%`;
  const boxes = requiredSigKeys.map(key => {
    const e = entries[key] ?? {};
    // Positioned absolutely within the line box instead of flex align-items,
    // so the image sits a fixed 6px above the line (never overlapping it)
    // regardless of how much of its own canvas the signer's ink fills.
    const img = e.imageUrl
      ? `<img src="${e.imageUrl}" style="max-width:100%;max-height:60px;object-fit:contain;position:absolute;bottom:6px;left:50%;transform:translateX(-50%)" />`
      : '';
    const name = e.name ? `<div style="font-size:11px;font-weight:600;margin-top:4px">${escapeHtml(e.name)}</div>` : '';
    // inline-block columns (not CSS grid/flex) — Chromium's print pagination
    // treats grid AND flex containers as one unbreakable unit, so if the row
    // doesn't fully fit in the space left on the current page the *whole*
    // row jumps to a fresh page, leaving a large blank gap behind.
    // inline-block content paginates normally like any other text flow.
    return `<div style="display:inline-block;vertical-align:top;width:${boxWidth};box-sizing:border-box;padding:0 12px;text-align:center;font-size:14px">`
      + `<div style="position:relative;width:100%;height:70px;border-bottom:1px solid #1f2937;margin-top:10px">${img}</div>`
      + name
      + `<div style="font-size:11px;color:#6b7280;margin-top:4px">${SIG_ROLE_LABELS[key] ?? key.replace(/^sig_/, '')}</div>`
      + `<div style="font-size:10px;color:#9ca3af;margin-top:4px">Date ....../....../......</div>`
      + `</div>`;
  }).join('');
  // font-size:0 on the row collapses the whitespace between adjacent
  // inline-block columns (otherwise the newline/indentation between them
  // renders as a visible gap, same trick as real space between <li>s).
  return `<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb">`
    + `<div style="font-size:0">${boxes}</div>`
    + `</div>`;
}

// Matches the print CSS the frontend already uses for its own "Print" button
// (student/request/new/[typeId]/page.tsx handlePrint), so a generated PDF
// and a browser print of the same filled-in preview look identical.
export async function renderHtmlToPdf(bodyHtml: string): Promise<Buffer> {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin:0; padding:15mm 20mm; font-family:'Times New Roman', serif; font-size:14px; color:#222; line-height:1.8; }
    /* Inline images (the logo) sit inside a line box sized by the
       paragraph's line-height, not just the image itself — that leaves a
       phantom gap above/below in Chromium's print renderer that a plain
       browser view doesn't show. Taking the image out of inline flow
       removes that line-height-driven padding; auto margins keep it
       centered the way the surrounding text-align:center intended. */
    img { max-width:100%; display:block; margin-left:auto; margin-right:auto; }
  </style></head><body>${bodyHtml}</body></html>`;

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    // The body's own CSS padding (25mm/20mm, matching the live preview's "A4
    // paper" div) is what controls page margins — without zeroing Chromium's
    // print-to-PDF margin here too, it stacks on top of that padding and
    // pushes everything down with a much bigger gap than the preview shows.
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
