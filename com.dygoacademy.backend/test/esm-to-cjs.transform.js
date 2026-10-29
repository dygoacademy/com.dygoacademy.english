// Nest 12 packages ship as ESM only. Node loads them from our CommonJS build
// through require(esm), but Jest's own module loader cannot, so turn the
// @nestjs/* files it pulls from node_modules into CommonJS before they run.
const ts = require('typescript');

// ESM files rebuild the CommonJS globals by hand; in CommonJS they already
// exist, and redeclaring them at the top level is a syntax error.
const CJS_GLOBAL_SHIMS =
  /^const (require = createRequire|__filename = fileURLToPath|__dirname = dirname)\(.*\);?$/gm;
const IMPORT_META_URL = /\bimport\.meta\.url\b/g;

module.exports = {
  process(source, filename) {
    const code = source
      .replace(CJS_GLOBAL_SHIMS, '')
      .replace(IMPORT_META_URL, "require('url').pathToFileURL(__filename).href");
    const out = ts.transpileModule(code, {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        sourceMap: false,
      },
    });
    return { code: out.outputText };
  },
};
