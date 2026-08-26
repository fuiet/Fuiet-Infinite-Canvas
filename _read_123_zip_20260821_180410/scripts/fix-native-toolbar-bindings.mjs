import { readFileSync, writeFileSync } from 'node:fs';

const appPath = new URL('../app.js', import.meta.url);
const testPath = new URL('../tests/ui-design-system.test.mjs', import.meta.url);
let app = readFileSync(appPath, 'utf8');
let tests = readFileSync(testPath, 'utf8');

const fixes = [
  ["      $('[data-multi-top]',toolbar).forEach", "      $$('[data-multi-top]',toolbar).forEach"],
  ["    $('[data-top-action]',toolbar).forEach", "    $$('[data-top-action]',toolbar).forEach"]
];
for (const [from, to] of fixes) {
  const count = app.split(from).length - 1;
  if (count !== 1) throw new Error(`Expected one toolbar binding match for ${from}, got ${count}`);
  app = app.split(from).join(to);
}

const marker = "\ntest('native result toolbar binds every generated action'";
const start = tests.indexOf(marker);
if (start >= 0) tests = tests.slice(0, start);
tests += `

test('native result toolbar binds every generated action', () => {
  const app = read('app.js');
  assert.ok(app.includes("$$('[data-multi-top]',toolbar).forEach"));
  assert.ok(app.includes("$$('[data-top-action]',toolbar).forEach"));
});
`;

writeFileSync(appPath, app, 'utf8');
writeFileSync(testPath, tests, 'utf8');
console.log('Native toolbar bindings fixed');
