import { env } from '../config/env.js';
import { readFile } from 'fs/promises';
import path from 'path';

const MAX_TEXT_LENGTH = 120_000;
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

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

function resolveLocalResumePath(resumeUrl) {
  const raw = String(resumeUrl || '').trim();
  if (!raw) return '';

  let sourcePath = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      sourcePath = new URL(raw).pathname || '';
    } catch {
      return '';
    }
  }

  const normalized = sourcePath.replace(/^\/+/, '');
  if (!normalized.startsWith('uploads/')) return '';

  const absolutePath = path.resolve(process.cwd(), normalized);
  const uploadsPrefix = `${UPLOADS_ROOT}${path.sep}`;
  if (absolutePath !== UPLOADS_ROOT && !absolutePath.startsWith(uploadsPrefix)) return '';
  return absolutePath;
}

function normalizeExtractedText(value) {
  return String(value || '')
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function isPdfDocument(contentType, sourceReference) {
  const source = String(sourceReference || '');
  return contentType.includes('pdf') || /\.pdf(\?|$)/i.test(source);
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

async function extractTextFromBuffer(buffer, { contentType = '', sourceReference = '' } = {}) {
  if (!buffer?.length) return '';
  if (isPdfDocument(String(contentType || '').toLowerCase(), sourceReference)) {
    return extractPdfText(buffer);
  }
  return normalizeExtractedText(buffer.toString('utf8'));
}

export async function extractResumeText(resumeUrl) {
  const localPath = resolveLocalResumePath(resumeUrl);
  if (localPath) {
    try {
      const buffer = await readFile(localPath);
      return extractTextFromBuffer(buffer, { sourceReference: localPath });
    } catch (error) {
      console.warn('Failed to read local resume file:', error?.message || error);
    }
  }

  const resolvedUrl = resolveResumeUrl(resumeUrl);
  if (!resolvedUrl) return '';

  try {
    const response = await fetch(resolvedUrl);
    if (!response.ok) return '';

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return extractTextFromBuffer(buffer, { contentType, sourceReference: resolvedUrl });
  } catch (error) {
    console.warn('Failed to fetch/scan resume text:', error?.message || error);
    return '';
  }
}
