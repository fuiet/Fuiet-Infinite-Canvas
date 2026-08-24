const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

class CanvasStore {
  constructor(dataDir) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(path.join(dataDir, 'canvas.sqlite'));
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA synchronous=NORMAL;
      CREATE TABLE IF NOT EXISTS tasks (
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
      CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at);
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data_json TEXT NOT NULL,
        current_version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(project_id, version)
      );
      CREATE INDEX IF NOT EXISTS idx_project_versions ON project_versions(project_id, version DESC);
    `);
    const taskCols=this.db.prepare('PRAGMA table_info(tasks)').all().map(x=>x.name);if(!taskCols.includes('priority'))this.db.exec('ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 50');
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_queue_priority ON tasks(status, priority DESC, created_at ASC)").run();
    this.db.prepare("UPDATE tasks SET status='queued', progress=MIN(progress, 5), cancel_requested=0, updated_at=? WHERE status IN ('running','cancelling')").run(new Date().toISOString());
  }

  parseTask(row) {
    if (!row) return null;
    return {
      id: row.id, status: row.status, progress: Number(row.progress || 0),
      providerId: row.provider_id, modelId: row.model_id, nodeType: row.node_type,
      payload: safeJson(row.payload_json, {}), output: safeJson(row.output_json, null), error: row.error || null,
      createdAt: row.created_at, updatedAt: row.updated_at, attempt: Number(row.attempt || 0),
      maxRetries: Number(row.max_retries || 0), cancelRequested: Boolean(row.cancel_requested), priority:Number(row.priority??50),
      logs: safeJson(row.logs_json, [])
    };
  }
  createTask(t) {
    this.db.prepare(`INSERT INTO tasks(id,status,progress,provider_id,model_id,node_type,payload_json,output_json,error,created_at,updated_at,attempt,max_retries,cancel_requested,logs_json,priority)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        t.id, t.status || 'queued', Number(t.progress || 0), t.providerId, t.modelId, t.nodeType,
        JSON.stringify(t.payload || {}), t.output ? JSON.stringify(t.output) : null, t.error || null,
        t.createdAt, t.updatedAt, Number(t.attempt || 0), Number(t.maxRetries ?? 1), t.cancelRequested ? 1 : 0,
        JSON.stringify(t.logs || []), Math.max(0,Math.min(100,Number(t.priority??50)))
      );
    return this.getTask(t.id);
  }
  getTask(id) { return this.parseTask(this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id)); }
  listTasks({status, limit=100}={}) {
    const rows = status ? this.db.prepare('SELECT * FROM tasks WHERE status=? ORDER BY created_at DESC LIMIT ?').all(status, limit)
      : this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?').all(limit);
    return rows.map(r=>this.parseTask(r));
  }
  nextQueuedTask() { return this.parseTask(this.db.prepare("SELECT * FROM tasks WHERE status='queued' ORDER BY priority DESC, created_at ASC LIMIT 1").get()); }
  updateTask(id, patch={}) {
    const current=this.getTask(id); if(!current) return null;
    const next={...current,...patch,updatedAt:patch.updatedAt||new Date().toISOString()};
    this.db.prepare(`UPDATE tasks SET status=?,progress=?,output_json=?,error=?,updated_at=?,attempt=?,max_retries=?,cancel_requested=?,logs_json=?,payload_json=?,priority=? WHERE id=?`).run(
      next.status, Number(next.progress||0), next.output==null?null:JSON.stringify(next.output), next.error||null, next.updatedAt,
      Number(next.attempt||0), Number(next.maxRetries||0), next.cancelRequested?1:0, JSON.stringify(next.logs||[]), JSON.stringify(next.payload||{}), Math.max(0,Math.min(100,Number(next.priority??50))), id
    );
    return this.getTask(id);
  }
  appendTaskLog(id, message, level='info') {
    const t=this.getTask(id); if(!t)return null;
    const logs=[...(t.logs||[]),{at:new Date().toISOString(),level,message:String(message)}].slice(-250);
    return this.updateTask(id,{logs});
  }
  deleteTask(id) { return this.db.prepare('DELETE FROM tasks WHERE id=?').run(id).changes > 0; }

  createProject({id,name,data,createdAt,updatedAt}) {
    const now=createdAt||new Date().toISOString(); const upd=updatedAt||now; const version=1;
    const text=JSON.stringify(data||{});
    this.db.prepare('INSERT INTO projects(id,name,data_json,current_version,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id,name||'未命名画布',text,version,now,upd);
    this.db.prepare('INSERT OR REPLACE INTO project_versions(project_id,version,data_json,created_at) VALUES(?,?,?,?)').run(id,version,text,upd);
    return this.getProject(id);
  }
  getProject(id) {
    const r=this.db.prepare('SELECT * FROM projects WHERE id=?').get(id); if(!r)return null;
    return {id:r.id,name:r.name,data:safeJson(r.data_json,{}),version:Number(r.current_version),createdAt:r.created_at,updatedAt:r.updated_at};
  }
  listProjects(limit=100) { return this.db.prepare('SELECT id,name,current_version,created_at,updated_at FROM projects ORDER BY updated_at DESC LIMIT ?').all(limit).map(r=>({id:r.id,name:r.name,version:Number(r.current_version),createdAt:r.created_at,updatedAt:r.updated_at})); }
  saveProject(id,{name,data,forceSnapshot=false}={}) {
    const p=this.getProject(id); if(!p)return null;
    const now=new Date().toISOString(); const text=JSON.stringify(data??p.data); const changed=text!==JSON.stringify(p.data);
    let version=p.version;
    if(changed || forceSnapshot) {
      version++;
      this.db.prepare('INSERT OR REPLACE INTO project_versions(project_id,version,data_json,created_at) VALUES(?,?,?,?)').run(id,version,text,now);
      // Keep the most recent 80 versions.
      this.db.prepare('DELETE FROM project_versions WHERE project_id=? AND id NOT IN (SELECT id FROM project_versions WHERE project_id=? ORDER BY version DESC LIMIT 80)').run(id,id);
    }
    this.db.prepare('UPDATE projects SET name=?,data_json=?,current_version=?,updated_at=? WHERE id=?').run(name||p.name,text,version,now,id);
    return this.getProject(id);
  }
  deleteProject(id) {
    this.db.prepare('DELETE FROM project_versions WHERE project_id=?').run(id);
    return this.db.prepare('DELETE FROM projects WHERE id=?').run(id).changes>0;
  }
  listProjectVersions(id,limit=30) { return this.db.prepare('SELECT version,created_at FROM project_versions WHERE project_id=? ORDER BY version DESC LIMIT ?').all(id,limit).map(r=>({version:Number(r.version),createdAt:r.created_at})); }
  restoreProjectVersion(id,version) {
    const r=this.db.prepare('SELECT data_json FROM project_versions WHERE project_id=? AND version=?').get(id,Number(version)); if(!r)return null;
    return this.saveProject(id,{data:safeJson(r.data_json,{}),forceSnapshot:true});
  }
}

function safeJson(text,fallback){try{return text==null?fallback:JSON.parse(text)}catch{return fallback}}
module.exports={CanvasStore};
