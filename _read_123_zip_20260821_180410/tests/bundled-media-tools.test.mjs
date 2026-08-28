import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronMain = fs.readFileSync(path.join(ROOT, 'electron-main.cjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const fetcher = fs.readFileSync(path.join(ROOT, 'scripts', 'fetch-windows-media-tools.ps1'), 'utf8');
const workflow = fs.readFileSync(path.resolve(ROOT, '..', '.github', 'workflows', 'windows-desktop-build.yml'), 'utf8');

test('packaged desktop resolves all media tools from Electron resources instead of Windows PATH', () => {
  assert.match(electronMain, /process\.resourcesPath/);
  assert.match(electronMain, /tools[\s\S]{0,300}ffmpeg[\s\S]{0,100}ffmpeg\.exe/);
  assert.match(electronMain, /FFMPEG_PATH\s*=\s*tools\.ffmpeg/);
  assert.match(electronMain, /FFPROBE_PATH\s*=\s*tools\.ffprobe/);
  assert.match(electronMain, /MAGICK_PATH\s*=\s*tools\.magick/);
  assert.match(electronMain, /MAGICK_HOME\s*=\s*imageMagickRoot/);
  assert.match(electronMain, /verifyBundledMediaTools/);
  assert.match(electronMain, /execFileAsync\(file, \['-version'\]/);
});

test('electron-builder places generated media tools outside app.asar as executable extra resources', () => {
  assert.equal(pkg.version, '4.2.0');
  assert.ok(Array.isArray(pkg.build.extraResources));
  const media = pkg.build.extraResources.find(x => x.from === 'runtime-tools' && x.to === 'tools');
  assert.ok(media, 'runtime-tools must be copied to resources/tools');
  assert.ok(pkg.build.files.includes('!runtime-tools/**'), 'runtime-tools should not also be packed into app.asar');
});

test('Windows build downloads pinned FFmpeg and official portable ImageMagick and validates packaged copies', () => {
  assert.match(fetcher, /ffmpeg-9\.0-essentials_build\.zip/);
  assert.match(fetcher, /e6b54767a6065919048f1a098eb27211ca4e12b4348a05d88777a5855d0b6e71/i);
  assert.match(fetcher, /ImageMagick-7\.1\.2-30-portable-Q16-HDRI-x64\.7z/);
  assert.match(fetcher, /Get-FileHash[\s\S]{0,120}SHA256/);
  assert.match(workflow, /fetch-windows-media-tools\.ps1/);
  assert.match(workflow, /release\\win-unpacked\\resources\\tools/);
  assert.match(workflow, /ffmpeg\.exe["']? -version/);
  assert.match(workflow, /ffprobe\.exe["']? -version/);
  assert.match(workflow, /magick\.exe["']? -version/);
});
