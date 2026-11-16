/**
 * Client-side Resume PDF Validator & Text Extractor using pdf.js (pdfjs-dist).
 * Runs 100% on the user's device without uploading the PDF binary to any server or storage bucket.
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

export const MAX_RESUME_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ResumeParseResult {
  text: string;
  fileName: string;
  warning?: string;
}

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function validatePdfResumeFile(file: File): Promise<{ normalizedName: string }> {
  if (!file) {
    throw new Error('No file selected. Please choose a PDF resume.');
  }

  const rawName = (file.name || 'resume.pdf').trim();
  const lowerName = rawName.toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  if (mimeType && mimeType !== 'application/pdf') {
    throw new Error(`Invalid file type (${file.type}). Please upload a valid PDF file (application/pdf).`);
  }

  const hasExplicitExtension = /\.[a-z0-9]+$/i.test(rawName);
  if (!lowerName.endsWith('.pdf') && hasExplicitExtension && mimeType !== 'application/pdf') {
    throw new Error('Invalid file format. Please upload a valid .pdf resume file.');
  }

  if (file.size <= 0) {
    throw new Error('The selected PDF file is empty. Please choose a valid PDF or paste your resume text manually.');
  }

  if (file.size > MAX_RESUME_PDF_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(`File size (${sizeMb} MB) exceeds the 5 MB limit. Please upload a PDF up to 5 MB.`);
  }

  const header = await file.slice(0, 5).text();
  if (!header.startsWith('%PDF-')) {
    throw new Error('Invalid PDF file: this file is corrupted or not a genuine PDF document.');
  }

  const normalizedName = lowerName.endsWith('.pdf') ? rawName : `${rawName}.pdf`;
  return { normalizedName };
}

export async function extractPdfResumeText(file: File): Promise<{ text: string; fileName: string }> {
  const { normalizedName } = await validatePdfResumeFile(file);
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
  });

  let pdf: Awaited<typeof loadingTask.promise> | null = null;
  try {
    pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;

      for (const rawItem of textContent.items) {
        const item = rawItem as { str?: string; hasEOL?: boolean; transform?: number[] };
        const str = item.str ?? '';
        const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;

        if (lastY !== null && y !== null && Math.abs(y - lastY) > 4 && currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }

        if (str) {
          if (currentLine && !currentLine.endsWith(' ') && !str.startsWith(' ')) {
            currentLine += ' ';
          }
          currentLine += str;
        }

        if (item.hasEOL && currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }

        if (y !== null) lastY = y;
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const joinedPage = lines.join('\n').trim();
      if (joinedPage) {
        pageTexts.push(joinedPage);
      }
    }

    const extracted = cleanExtractedText(pageTexts.join('\n\n')).slice(0, 150000);
    const meaningfulChars = extracted.replace(/[\s\W_]+/g, '').length;

    if (!extracted || meaningfulChars < 15) {
      throw new Error(
        'No readable text found in this PDF (it may be a scanned image). Please paste your resume text manually into the Resume Content box.'
      );
    }

    return { text: extracted, fileName: normalizedName };
  } finally {
    await pdf?.cleanup?.().catch(() => {});
    await loadingTask.destroy().catch(() => {});
  }
}

export async function extractResumeTextFromFile(file: File): Promise<ResumeParseResult> {
  const fileName = (file?.name || 'resume.pdf').trim();
  try {
    const res = await extractPdfResumeText(file);
    return { text: res.text, fileName: res.fileName };
  } catch (err: any) {
    return {
      text: '',
      fileName,
      warning:
        err?.message ||
        'Could not extract readable text from this PDF. Please paste your resume text manually.',
    };
  }
}
