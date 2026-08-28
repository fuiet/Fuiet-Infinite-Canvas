from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / '_read_123_zip_20260821_180410'

# 1) Remove cloud/serverless/remote-persistence runtime completely.
for rel in [
    'functions',
    'dist/server',
    'supabase',
]:
    path = PROJECT / rel
    if path.exists():
        shutil.rmtree(path)

for rel in [
    'wrangler.toml',
    'SECURITY_DEPLOYMENT.md',
    'PROVIDER_RUNTIME_HARDENING.md',
]:
    path = PROJECT / rel
    if path.exists():
        path.unlink()

# Remove obsolete one-off workflows; keep only generic CI and this temporary converter.
workflows = ROOT / '.github' / 'workflows'
if workflows.exists():
    for path in workflows.glob('*.yml'):
        if path.name not in {'ci.yml', 'convert-local-standalone-v1.yml'}:
            path.unlink()
    for path in workflows.glob('*.yaml'):
        if path.name not in {'ci.yml', 'convert-local-standalone-v1.yaml'}:
            path.unlink()

# Remove old repair scripts that target Cloudflare/Workers/Pages/Supabase runtime.
root_scripts = ROOT / 'scripts'
if root_scripts.exists():
    for path in root_scripts.glob('*.py'):
        if path.name == 'convert-local-standalone-v1.py':
            continue
        text = path.read_text(encoding='utf-8', errors='ignore').lower()
        if any(token in text for token in ('cloudflare', 'wrangler', 'pages-entry', 'secure-index', 'worker runtime', 'supabase_service_role_key')):
            path.unlink()

project_scripts = PROJECT / 'scripts'
if project_scripts.exists():
    for path in project_scripts.glob('*.py'):
        text = path.read_text(encoding='utf-8', errors='ignore').lower()
        if any(token in text for token in ('cloudflare', 'wrangler', 'pages-entry', 'secure-index', 'production-entry', 'worker runtime', 'supabase_service_role_key')):
            path.unlink()

# Remove tests that only validate cloud/serverless/auth-owner runtime.
tests = PROJECT / 'tests'
if tests.exists():
    for path in tests.glob('*.test.mjs'):
        text = path.read_text(encoding='utf-8', errors='ignore').lower()
        if any(token in text for token in (
            'dist/server/', 'wrangler.toml', 'pages-entry', 'secure-index', 'production-entry',
            'canvAs_owner'.lower(), 'canvas_single_user_no_auth', 'supabase_service_role_key',
            'cloudflare', 'worker.fetch'
        )):
            path.unlink()

# 2) Force the Node application into local-only mode.
server = PROJECT / 'server.js'
text = server.read_text(encoding='utf-8')
replacements = {
    "const ADMIN_PASSWORD = String(process.env.CANVAS_ADMIN_PASSWORD || '');": "const ADMIN_PASSWORD = ''; // standalone: no login",
    "const HOST = String(process.env.HOST || process.env.CANVAS_HOST || (ADMIN_PASSWORD ? '0.0.0.0' : '127.0.0.1'));": "const HOST = '127.0.0.1'; // standalone: never expose the local API to the LAN by default",
    "const TRUST_PROXY = process.env.CANVAS_TRUST_PROXY === '1';": "const TRUST_PROXY = false;",
    "const ALLOW_CORS = process.env.CANVAS_ALLOW_CORS === '1';": "const ALLOW_CORS = false;",
    "  'x-auth-token','x-access-token','x-secret-key','cf-access-client-secret'": "  'x-auth-token','x-access-token','x-secret-key'",
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'missing server marker: {old}')
    text = text.replace(old, new, 1)
server.write_text(text, encoding='utf-8')

# 3) Make package scripts local-only.
package_path = PROJECT / 'package.json'
package = json.loads(package_path.read_text(encoding='utf-8'))
package['name'] = 'fuiet-infinite-canvas-local'
package['version'] = '4.0.0'
package['description'] = 'Fuiet Infinite Canvas 单机版：本地 Node 服务、本地 SQLite、本地媒体与本机加密供应商密钥。'
package['scripts'] = {
    'start': 'node server.js',
    'start:local': 'node server.js',
    'check': 'node --check app.js && node --check provider-adapter-contract.js && node --check provider-runtime-core.js && node --check server.js && node --check store.js && node --check models.js && node --check three-runtime.js && node --check ui-zh.js && node --check ui-v23.js && node --check ui-connect-v23.js',
    'test': 'node --test tests/*.test.mjs'
}
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# 4) Replace README with the local product contract.
(PROJECT / 'README.md').write_text('''# Fuiet Infinite Canvas · 单机版 v4.0\n\n这是纯本机版本，不再使用 Cloudflare Pages / Workers，也不依赖 Supabase。\n\n## 运行架构\n\n- 界面：浏览器打开 `http://127.0.0.1:8080`\n- 服务：本机 `server.js`\n- 供应商：只需要 API Base URL + API Key\n- API Key：首次启动自动生成 `.data/secret.key`，使用 AES-256-GCM 加密后保存\n- 供应商配置：`.data/providers.json`\n- 项目 / 任务：`.data/canvas.sqlite`\n- 图片 / 视频 / 音频：`.data/media/`\n- 登录：无\n- owner / RLS：无\n- 云端环境变量：无\n\n## 启动\n\nWindows 可以直接双击：\n\n```text\nstart-local.bat\n```\n\n也可以命令行启动：\n\n```bash\nnpm start\n```\n\n程序默认只监听 `127.0.0.1:8080`，不会默认暴露到局域网或公网。\n\n## 依赖\n\n- Node.js 22+\n- 需要本地媒体处理时：FFmpeg / FFprobe / ImageMagick\n\n## 数据备份\n\n关闭程序后，备份整个 `.data/` 目录即可。尤其不要单独丢失 `.data/secret.key`，否则原有供应商 API Key 密文无法解密。\n\n## 开发检查\n\n```bash\nnpm run check\nnpm test\n```\n''', encoding='utf-8')

# 5) One-click Windows launcher.
(PROJECT / 'start-local.bat').write_text(r'''@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22+ is required.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8080"
node server.js
if errorlevel 1 pause
''', encoding='utf-8')

# 6) Regression test for the new architecture.
(TEST := PROJECT / 'tests' / 'local-standalone-architecture.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('standalone runtime has no cloud/serverless entrypoints', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'wrangler.toml')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'functions')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'dist/server')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'supabase')), false);
});

test('standalone server is local-only and self-encrypts provider keys', () => {
  assert.match(server, /const HOST = '127\\.0\\.0\\.1'/);
  assert.match(server, /const ADMIN_PASSWORD = ''/);
  assert.match(server, /SECRET_FILE = path\\.join\\(DATA_DIR, 'secret\\.key'\\)/);
  assert.match(server, /createCipheriv\\('aes-256-gcm', MASTER_KEY, iv\\)/);
  assert.doesNotMatch(server, /PROVIDER_SECRET_KEY/);
  assert.doesNotMatch(server, /SUPABASE_/);
});

test('package scripts no longer validate a Worker build', () => {
  assert.equal(pkg.name, 'fuiet-infinite-canvas-local');
  assert.doesNotMatch(pkg.scripts.check, /dist\\/server/);
  assert.equal(pkg.scripts.start, 'node server.js');
});
''', encoding='utf-8')

# 7) Remove the temporary converter files from the final repository state.
workflow = ROOT / '.github' / 'workflows' / 'convert-local-standalone-v1.yml'
if workflow.exists():
    workflow.unlink()
self_path = ROOT / 'scripts' / 'convert-local-standalone-v1.py'
# Keep this script until the process exits; the workflow removes it before commit.
print('Local standalone conversion applied.')
