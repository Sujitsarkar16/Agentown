/* npm packages can live outside the static site. No build needed for end users. */
const path = require('node:path');
const fs = require('node:fs');
const modules = process.env.DOCUMENT_NODE_MODULES;
const esbuild = require(modules ? path.join(modules, 'esbuild') : 'esbuild');
const root = path.resolve(__dirname, '..');
(async () => {
  const common = { minify: true, legalComments: 'eof', platform: 'browser', nodePaths: modules ? [modules] : [] };
  await esbuild.build({ ...common, entryPoints: [path.join(__dirname, 'document-vendor-entry.js')], bundle: true, globalName: 'NirmalDocumentLibs', format: 'iife', outfile: path.join(root, 'vendor/document-tools.js') });
  await esbuild.build({ ...common, entryPoints: [require.resolve('pdfjs-dist/build/pdf.worker.js', { paths: [modules || root] })], outfile: path.join(root, 'vendor/pdf.worker.min.js') });
  const notices = ['Offline Document Studio libraries. Additional bundled dependency notices are preserved in document-tools.js.'];
  for (const name of ['pdf-lib', 'pdfjs-dist', 'mammoth', 'docx', 'html2canvas', 'marked', 'dompurify', 'fflate', 'buffer']) {
    const packageRoot = path.join(modules || path.join(root, 'node_modules'), name);
    const info = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE-MIT.txt', 'COPYING'].find(file => fs.existsSync(path.join(packageRoot, file)));
    notices.push(`\n${name} ${info.version} — ${info.license}\n${license ? fs.readFileSync(path.join(packageRoot, license), 'utf8') : 'Copyright and license notice preserved in the bundled source.'}`);
  }
  fs.writeFileSync(path.join(root, 'vendor/DOCUMENT-LICENSES.txt'), notices.join('\n'), 'utf8');
  console.log('Built offline document libraries and PDF worker.');
})().catch(e => { console.error(e); process.exitCode = 1; });
