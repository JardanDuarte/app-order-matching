import fs from 'fs';
import path from 'path';
import url from 'url';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const tests = [];

globalThis.test = function test(name, fn) {
  tests.push({ name, fn });
};

function findTestFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return findTestFiles(fullPath);
      }

      return entry.name.endsWith('.test.mjs') ? [fullPath] : [];
    });
}

const files = findTestFiles(__dirname)
  .filter(file => !file.endsWith('run-tests.mjs'))
  .sort();

for (const file of files) {
  await import(url.pathToFileURL(file));
}

let failures = 0;

for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

console.log(`\n${tests.length - failures}/${tests.length} tests passed`);

if (failures > 0) {
  process.exitCode = 1;
}
