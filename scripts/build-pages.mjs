import { build } from 'esbuild';
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const password = process.env.GAME_PASSWORD;
if (!password || !/^\d{4}$/.test(password)) throw new Error('Set GAME_PASSWORD to a four-digit code before building.');
const output = path.join(root, 'docs');
const bundle = await build({
  absWorkingDir: root,
  entryPoints: ['static/entry.tsx'],
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  outfile: 'game.js',
  write: false,
  legalComments: 'inline',
});
const javascript = bundle.outputFiles.find(file => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find(file => file.path.endsWith('.css')).contents;
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, 310000, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(gzipSync(javascript)), cipher.final(), cipher.getAuthTag()]);
await mkdir(path.join(output, 'reference'), { recursive: true });
await mkdir(path.join(output, 'vendor'), { recursive: true });
await writeFile(path.join(output, 'game.enc'), Buffer.concat([Buffer.from('MB01'), salt, iv, encrypted]));
await writeFile(path.join(output, 'styles.css'), css);
await copyFile(path.join(root, 'static/index.html'), path.join(output, 'index.html'));
await copyFile(path.join(root, 'static/unlock.js'), path.join(output, 'unlock.js'));
for (const asset of ['reference/minam-facade.webp', 'vendor/THREE-LICENSE.txt', 'favicon.svg', 'robots.txt']) {
  await copyFile(path.join(root, 'public', asset), path.join(output, asset));
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`GitHub Pages files ready in docs/ (${Math.round(encrypted.length / 1024)} KiB game).`);
