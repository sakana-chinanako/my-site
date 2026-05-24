export const ALLOWED_DOC_EXT = ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.md'];
export const ALLOWED_IMG_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp'];

export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getDocColor(ext) {
  const e = ext.toLowerCase();
  if (e === '.pdf') return {
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-600 dark:text-red-400'
  };
  if (['.doc','.docx'].includes(e)) return {
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-600 dark:text-blue-400'
  };
  if (['.xls','.xlsx'].includes(e)) return {
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-600 dark:text-green-400'
  };
  if (['.ppt','.pptx'].includes(e)) return {
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-600 dark:text-orange-400'
  };
  return {
    bgClass: 'bg-slate-100 dark:bg-slate-700',
    textClass: 'text-slate-500 dark:text-slate-400'
  };
}

export function supportsFullText(ext) {
  return ['.pdf','.txt','.md'].includes(ext.toLowerCase());
}
