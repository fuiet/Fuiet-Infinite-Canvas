import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/video-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260901-video-wait-progress-1';

test('provider success and result pending stay visually active',()=>{
  assert.match(app,/\['queued','polling','retrying','running','fallback','provider_succeeded','result_pending'\]/);
});

test('video nodes keep upstream diagnostics out of the canvas waiting state',()=>{
  assert.match(app,/function taskDiagnosticSnapshot\(info=\{\}\)/);
  assert.match(app,/providerVideoId/);
  assert.match(app,/providerRawStatus/);
  assert.match(app,/providerProgress/);
  assert.match(app,/lastPollAt/);
  assert.match(app,/function videoTaskDiagnosticsHtml\(\)/);
  assert.match(app,/function videoTaskDiagnosticsHtml\(\)\{return''\}/);
  assert.match(app,/data-video-task-diagnostics/);
  assert.match(app,/syncNodeTaskDiagnostics\(n,info\)/);
  assert.match(app,/syncNodeTaskDiagnostics\(n,created\.task\)/);
  const start=app.indexOf('function taskDiagnosticSnapshot');
  const end=app.indexOf('function videoTaskDiagnosticsHtml',start);
  const section=app.slice(start,end);
  assert.doesNotMatch(section,/providerCreateResponse|providerOutput|apiKey/i);
  assert.match(app,/Bearer \[redacted\]/);
  const visibleStart=app.indexOf('function videoTaskDiagnosticsHtml');
  const visibleEnd=app.indexOf('function defaultNodeName',visibleStart);
  assert.doesNotMatch(app.slice(visibleStart,visibleEnd),/上游实时状态|video_id|task_id|最近轮询|lastError/);
});

test('task manager shows upstream diagnostics',()=>{
  assert.match(app,/taskDiagnosticSummary\(t\)/);
});

test('empty diagnostics slot and fresh app cache are deployed',()=>{
  assert.match(css,/\.video-task-diagnostics/);
  assert.ok(index.includes(`styles/video-node.css?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
});
