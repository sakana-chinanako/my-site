/// <reference types="astro/client" />

declare module '*.css';

interface IndexFile {
  name: string;
  category: string;
  path: string;
  type: 'doc' | 'image';
  ext: string;
  size: string;
  sizeBytes: number;
  modified: string;
  fullText?: string;
  tags?: string[];
  description?: string;
  meta?: Record<string, unknown>;
}

interface FileIndex {
  version: number;
  generatedAt: string;
  stats: { total: number; docs: number; images: number; categories: string[]; fullTextFiles: number; };
  files: IndexFile[];
}

interface Window { showToast: (message: string, isError?: boolean) => void; }
