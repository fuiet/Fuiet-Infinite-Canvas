import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {CanvasStore,CURRENT_SCHEMA_VERSION}=require('../store.js');

function legacyDatabase(dir){
  const file=path.join(dir,'canvas.sqlite');
  const db=new DatabaseSync(file);
  db.exec(`
    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      output_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      attempt INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 1,
      cancel_requested INTEGER NOT NULL DEFAULT 0,
      logs_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      current_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE project_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, version)
    );
  `);
  const now=new Date().toISOString();
  db.prepare(`INSERT INTO tasks(id,status,progress,provider_id,model_id,node_type,payload_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)`).run('legacy_task','polling',55,'provider','model','video',JSON.stringify({_upstream:{id:'up_legacy'}}),now,now);
  db.close();
  return file;
}

test('legacy local database upgrades in place without losing tasks',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-migrate-'));
  legacyDatabase(dir);
  const store=new CanvasStore(dir);
  assert.equal(store.schemaVersion(),CURRENT_SCHEMA_VERSION);
  assert.deepEqual(store.listMigrations().map(x=>x.version),[1,2]);
  const columns=new Set(store.db.prepare('PRAGMA table_info(tasks)').all().map(x=>x.name));
  for(const name of ['priority','provider_status','result_status','upstream_task_id','provider_output_json','provider_succeeded_at','result_saved_at','last_poll_at','last_error'])assert.ok(columns.has(name),`missing migrated column ${name}`);
  const task=store.getTask('legacy_task');
  assert.ok(task);
  assert.equal(task.upstreamTaskId,'');
  assert.equal(task.payload._upstream.id,'up_legacy');
  assert.equal(task.status,'queued');
  const backups=fs.readdirSync(path.join(dir,'backups')).filter(name=>name.endsWith('.sqlite'));
  assert.ok(backups.length>=1,'expected a pre-migration SQLite backup');
  store.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
});

test('opening an already migrated database is idempotent',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-migrate-'));
  let store=new CanvasStore(dir);
  assert.equal(store.schemaVersion(),CURRENT_SCHEMA_VERSION);
  const first=store.listMigrations();
  store.db.close();
  store=new CanvasStore(dir);
  assert.equal(store.schemaVersion(),CURRENT_SCHEMA_VERSION);
  assert.deepEqual(store.listMigrations(),first);
  store.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
});
