import { env } from '../config/env.js';

const MAX_TEXT_LENGTH = 120_000;

function resolveResumeUrl(resumeUrl) {
  const raw = String(resumeUrl || '').trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith('/')) return '';

  const apiBase = String(env.API_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (!apiBase) return '';
  return `${apiBase}${raw}`;
}

function normalizeExtractedText(value) {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

async function extractPdfText(buffer) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const parsed = await pdfParse(buffer);
    return normalizeExtractedText(parsed?.text || '');
  } catch (error) {
    console.warn('PDF parse failed, falling back to raw text extraction:', error?.message || error);
    return '';
  }
}

export async function extractResumeText(resumeUrl) {
  const resolvedUrl = resolveResumeUrl(resumeUrl);
  if (!resolvedUrl) return '';

  try {
    const response = await fetch(resolvedUrl);
    if (!response.ok) return '';

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) return '';

    if (contentType.includes('pdf') || /\.pdf(\?|$)/i.test(resolvedUrl)) {
      return extractPdfText(buffer);
    }

    return normalizeExtractedText(buffer.toString('utf8'));
  } catch (error) {
    console.warn('Failed to fetch/scan resume text:', error?.message || error);
    return '';
  }
}
