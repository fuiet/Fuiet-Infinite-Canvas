from pathlib import Path

root=Path('_read_123_zip_20260821_180410')

# Provider zero-config: provider auto configuration now lives in the hydrated bootstrap sequence.
p=root/'tests'/'provider-zero-config.test.mjs'
s=p.read_text(encoding='utf-8')
old="""test('canvas and models pages load real auto configuration before application model logic',()=>{\n  const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');\n  const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');\n  const contract='./provider-adapter-contract.js';\n  const auto='./provider-auto-config-v1.js';\n  assert.ok(index.indexOf(contract)>=0);\n  assert.ok(index.indexOf(auto)>index.indexOf(contract));\n  assert.ok(index.indexOf('./app.js')>index.indexOf(auto));\n  assert.ok(models.indexOf(contract)>=0);\n  assert.ok(models.indexOf(auto)>models.indexOf(contract));\n  assert.ok(models.indexOf('./models.js')>models.indexOf(auto));\n  assert.equal(models.includes('provider-auto-ready-v1.js'),false);\n});\n"""
new="""test('canvas and models pages hydrate storage before real auto configuration and application model logic',()=>{\n  const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');\n  const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');\n  const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');\n  const contract='./provider-adapter-contract.js';\n  assert.ok(index.indexOf(contract)>=0);\n  assert.ok(index.indexOf('./browser-runtime.js')>index.indexOf(contract));\n  assert.ok(index.indexOf('./browser-storage-manager.js')>index.indexOf('./browser-runtime.js'));\n  assert.ok(index.indexOf('./browser-bootstrap.js')>index.indexOf('./browser-storage-manager.js'));\n  assert.ok(models.indexOf(contract)>=0);\n  assert.ok(models.indexOf('./browser-bootstrap.js')>models.indexOf('./browser-storage-manager.js'));\n  const auto=bootstrap.indexOf('./provider-auto-config-v1.js');\n  assert.ok(auto>=0);\n  assert.ok(bootstrap.indexOf('./app.js')>auto);\n  assert.ok(bootstrap.indexOf('./models.js')>auto);\n  assert.equal(bootstrap.includes('provider-auto-ready-v1.js'),false);\n});\n"""
if old not in s: raise SystemExit('provider zero-config startup test pattern missing')
p.write_text(s.replace(old,new),encoding='utf-8')

# Text node: dynamic bootstrap owns the plugin load after IndexedDB hydration.
p=root/'tests'/'text-node-v23.test.mjs'
s=p.read_text(encoding='utf-8')
anchor="""  const app = read('app.js');\n  const css = read('styles/text-node.css');\n  const dblclick = read('text-node-doubleclick-v1.js');\n  const html = read('index.html');\n\n  assert.match(app, /textInputMode/);\n"""
replacement="""  const app = read('app.js');\n  const css = read('styles/text-node.css');\n  const dblclick = read('text-node-doubleclick-v1.js');\n  const html = read('index.html');\n  const bootstrap = read('browser-bootstrap.js');\n\n  assert.match(app, /textInputMode/);\n"""
if anchor not in s: raise SystemExit('text node bootstrap declaration pattern missing')
s=s.replace(anchor,replacement,1)
s=s.replace("  assert.match(html, /text-node-doubleclick-v1\\.js/);\n", "  assert.match(html, /browser-bootstrap\\.js/);\n  assert.match(bootstrap, /text-node-doubleclick-v1\\.js/);\n  assert.ok(bootstrap.indexOf('text-node-doubleclick-v1.js')>bootstrap.indexOf('app.js'));\n", 1)
p.write_text(s,encoding='utf-8')

# UI stack/dock: HTML owns the bootstrap; bootstrap owns hydrated UI plugin ordering.
p=root/'tests'/'ui-design-system.test.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace("  const legacyLayer = read('styles/legacy-layer.css');\n", "  const legacyLayer = read('styles/legacy-layer.css');\n  const bootstrap = read('browser-bootstrap.js');\n", 1)
s=s.replace("  assert.match(html, /ui-v23\\.js/);\n", "  assert.match(html, /browser-bootstrap\\.js/);\n  assert.match(bootstrap, /ui-v23\\.js/);\n  assert.ok(bootstrap.indexOf('ui-v23.js')>bootstrap.indexOf('app.js'));\n", 1)
s=s.replace("  const dock = read('bottom-dock-v4.js');\n  assert.match(html, /bottom-dock-v4\\.js/);\n", "  const dock = read('bottom-dock-v4.js');\n  const bootstrap = read('browser-bootstrap.js');\n  assert.match(html, /browser-bootstrap\\.js/);\n  assert.match(bootstrap, /bottom-dock-v4\\.js/);\n  assert.ok(bootstrap.indexOf('bottom-dock-v4.js')>bootstrap.indexOf('ui-v23.js'));\n", 1)
p.write_text(s,encoding='utf-8')
