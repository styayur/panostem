import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseDocument } from '../../src/knowledge/parse.ts';
const exec = promisify(execFile);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const textFormats = new Set(['.md', '.markdown', '.mdown', '.tex', '.rmd', '.ipynb', '.html', '.htm']);
export const ignored = new Set(['.git', '.obsidian', 'node_modules', '.venv', 'venv', '__pycache__', '.ipynb_checkpoints', 'target', '.DS_Store']);
export async function gitRead(root, args) {
  try { return (await exec('git', ['-C', root, ...args], { timeout: 20000, maxBuffer: 4 * 1024 * 1024 })).stdout.trim(); }
  catch { return null; }
}
export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await fs.rename(temp, file);
}
/** No links followed, includes resolved, code executed, dependencies installed, or source files written. */
export class KnowledgeSourceAdapter {
  constructor(root, sourceId, options = {}) { this.root = path.resolve(root); this.sourceId = sourceId; this.options = options; }
  async *discover() {
    const rootStat = await fs.lstat(this.root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Source root must be a real directory, not a symlink');
    const canonical = await fs.realpath(this.root);
    const walk = async function* (folder, prefix = '') {
      const entries = await fs.readdir(folder, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (ignored.has(entry.name) || (this.options.ignore ?? []).includes(entry.name)) continue;
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        const full = path.join(folder, entry.name);
        const info = await fs.lstat(full);
        if (info.isSymbolicLink()) { yield { path: relative, disposition: 'unsupported', reason: 'Symlink/reparse point skipped', bytes: info.size }; continue; }
        const real = await fs.realpath(full);
        const containment = path.relative(canonical, real);
        if (containment.startsWith('..' + path.sep) || containment === '..' || path.isAbsolute(containment)) throw new Error('Path escaped source root');
        if (info.isDirectory()) yield* walk.call(this, full, relative);
        else if (info.isFile()) yield { path: relative, bytes: info.size, full, disposition: 'not-yet-processed' };
        else yield { path: relative, bytes: info.size, disposition: 'unsupported', reason: 'Non-regular file' };
      }
    }.bind(this);
    yield* walk(canonical);
  }
  async read(record, revision) {
    if (!record.full) return { ...record, units: [] };
    const ext = path.extname(record.path).toLowerCase();
    if (this.options.types?.length && !this.options.types.includes(ext)) return { ...record, full: undefined, disposition: 'unsupported', reason: 'Excluded by file-type scope', units: [] };
    if (!textFormats.has(ext)) return { ...record, full: undefined, disposition: 'unsupported', reason: /\.(pdf|png|jpg|jpeg|svg|pptx?|docx?)$/i.test(record.path) ? 'Binary/media requires separate licensed extraction and review' : 'Not a supported scientific document format', units: [] };
    if (record.bytes > (this.options.maxBytes ?? 2_000_000)) return { ...record, full: undefined, disposition: 'unsupported', reason: 'File exceeds configured byte limit', units: [] };
    try {
      const contained = path.relative(await fs.realpath(this.root), await fs.realpath(record.full));
      if (contained === '..' || contained.startsWith('..' + path.sep) || path.isAbsolute(contained)) throw new Error('Read path escaped source root');
      // Recheck immediately before opening; refuse any path that changed into a link.
      if ((await fs.lstat(record.full)).isSymbolicLink()) throw new Error('Source became a symlink');
      const bytes = await fs.readFile(record.full);
      if (bytes.length > (this.options.maxBytes ?? 2_000_000)) throw new Error('File grew beyond configured byte limit');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const contentHash = hash(bytes);
      const units = parseDocument({ sourceId: this.sourceId, path: record.path, origin: this.options.origin ?? record.path,
        revision: revision ?? contentHash, contentHash, text });
      return { path: record.path, bytes: bytes.length, contentHash, format: ext, disposition: units.length ? 'needs-review' : 'unsupported',
        reason: units.length ? 'Read and parsed; model and rights review required' : 'No readable knowledge blocks (notebook code is never executed)', units };
    } catch (error) { return { path: record.path, bytes: record.bytes, disposition: 'failed', reason: String(error.message), units: [] }; }
  }
}
