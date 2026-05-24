process.env.PDFJS_DISABLE_RANGE = 'true';

import { ALLOWED_DOC_EXT, ALLOWED_IMG_EXT, formatBytes, supportsFullText } from '../src/utils/file-utils.js';
import fs, { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const outputFile = path.join(publicDir, 'file-index.json');
const cacheFile = path.join(__dirname, '..', '.index-cache.json');

const CFG = { INDEX_VERSION: 1, MAX_SCAN_DEPTH: 3, FULL_TEXT_LIMIT: 12000, HASH_BYTES_THRESHOLD: 50 * 1024 * 1024 };

let pdfP = null;
try {
  const m = await import('pdf-parse');
  pdfP = m.default?.default || m.default;
  if (pdfP) console.log('✅ PDF 全文索引已启用');
  else console.log('⚠️ pdf-parse 加载异常');
} catch {
  console.log('⚠️ pdf-parse 未安装或加载失败，PDF 全文索引不可用');
}

function getHash(fp) {
  return new Promise((rs) => {
    try {
      const st = fs.statSync(fp);
      if (st.size > CFG.HASH_BYTES_THRESHOLD) {
        rs('mtime:' + st.mtimeMs + ':' + st.size);
        return;
      }
      const h = createHash('md5'), s = createReadStream(fp);
      s.on('error', (e) => {
        console.warn('⚠️ 哈希失败:', path.relative(publicDir, fp), e.message);
        rs('');
      });
      s.on('data', (c) => h.update(c));
      s.on('end', () => rs(h.digest('hex')));
    } catch (e) {
      console.warn('⚠️ stat失败:', path.relative(publicDir, fp), e.message);
      rs('');
    }
  });
}

let cache = {};
if (fs.existsSync(cacheFile)) {
  try {
    const r = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    cache = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' ? v : v?.hash]));
    console.log('📦 缓存:', Object.keys(cache).length, '条');
  } catch (e) {
    console.warn('⚠️ 缓存损坏');
    cache = {};
  }
}

const newCache = {};

async function scanDir(dir, basePath = '', maxDepth = CFG.MAX_SCAN_DEPTH, cd = 0, otm = new Map()) {
  const items = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name), rp = basePath ? basePath + '/' + e.name : e.name;
      if (e.isDirectory()) {
        if (cd + 1 < maxDepth) items.push(...await scanDir(fp, rp, maxDepth, cd + 1, otm));
      } else {
        const ext = path.extname(e.name).toLowerCase(), st = fs.statSync(fp);
        const isDoc = ALLOWED_DOC_EXT.includes(ext), isImg = ALLOWED_IMG_EXT.includes(ext);
        if (isDoc || isImg) {
          const type = isDoc ? 'doc' : 'image';
          const cat = basePath.split('/').slice(1)[0] || '未分类';
          const mtime = st.mtime.toISOString();
          const hash = await getHash(fp);
          newCache[rp] = hash;
          const cached = cache[rp], needsUpdate = !cached || cached !== hash;
          let fullText = '', meta = null;
          // 修复：仅对文档类型处理全文
          if (isDoc) {
            if (needsUpdate && supportsFullText(ext)) {
              if (ext === '.pdf' && pdfP) {
                try {
                  const db = fs.readFileSync(fp);
                  const pd = await pdfP(db);
                  fullText = (pd.text || '').substring(0, CFG.FULL_TEXT_LIMIT);
                  if (fullText) console.log('📄 PDF:', rp, '(' + fullText.length + '字符)');
                } catch (e2) {
                  console.warn('⚠️ PDF解析失败:', rp, e2.message);
                }
              } else if (['.txt', '.md'].includes(ext)) {
                try {
                  const tx = fs.readFileSync(fp, 'utf-8');
                  fullText = tx.substring(0, CFG.FULL_TEXT_LIMIT);
                } catch (e2) {
                  console.warn('⚠️ 文本失败:', rp, e2.message);
                }
              }
            } else if (otm.has('/' + rp)) {
              fullText = otm.get('/' + rp);
            }
          }
          if (isImg) {
            const mp = path.join(path.dirname(fp), path.basename(e.name, ext) + '.json');
            if (fs.existsSync(mp)) {
              try {
                meta = JSON.parse(fs.readFileSync(mp, 'utf-8'));
              } catch (e2) {
                console.warn('⚠️ 元数据失败:', mp, e2.message);
              }
            }
          }
          items.push({
            name: e.name,
            category: cat,
            path: "/" + encodeURI(rp),
            type: type,
            ext: ext.replace(".", ""),
            size: formatBytes(st.size),
            sizeBytes: st.size,
            modified: mtime,
            fullText,
            meta
          });
        }
      }
    }
  } catch (e) {
    console.error('⚠️ 扫描失败:', path.relative(publicDir, dir), e.message);
  }
  return items;
}

console.log('🔍 开始扫描文件...');
let oldIndex = { files: [] };
if (fs.existsSync(outputFile)) {
  try {
    oldIndex = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    console.log('📦 旧索引:', oldIndex.files?.length || 0, '条');
  } catch (e) {
    console.warn('⚠️ 旧索引损坏');
  }
}

const oldTextMap = new Map();
for (const f of oldIndex.files) {
  if (f.fullText || f.pdfText) oldTextMap.set(decodeURI(f.path), f.fullText || f.pdfText);
}

const docs = await scanDir(path.join(publicDir, 'docs'), 'docs', CFG.MAX_SCAN_DEPTH, 0, oldTextMap);
const images = await scanDir(path.join(publicDir, 'images'), 'images', CFG.MAX_SCAN_DEPTH, 0, oldTextMap);

const index = {
  version: CFG.INDEX_VERSION,
  generatedAt: new Date().toISOString(),
  stats: {
    total: docs.length + images.length,
    docs: docs.length,
    images: images.length,
    categories: [...new Set([...docs.map(d => d.category), ...images.map(i => i.category)])],
    fullTextFiles: docs.filter(d => d.fullText).length
  },
  files: [...docs, ...images]
};

let ok = true;
try {
  const isDev = process.env.NODE_ENV !== 'production';
  fs.writeFileSync(outputFile, JSON.stringify(index, null, isDev ? 2 : 0));
  fs.writeFileSync(cacheFile, JSON.stringify(newCache, null, 2));
  console.log('\n✅ 索引:', docs.length, '文档(', index.stats.fullTextFiles, '可搜索),', images.length, '图片,共', index.stats.total, '文件');
  console.log('📊 分类:', index.stats.categories.join(', '));
} catch (e) {
  console.error('❌ 写入失败:', e.message);
  ok = false;
}

if (!ok) process.exit(1);
