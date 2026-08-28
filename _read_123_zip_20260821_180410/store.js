const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const RECOVERABLE_ACTIVE_STATUSES = ['running','polling','result_pending','persisting','provider_succeeded'];

function nowIso(){ return new Date().toISOString(); }
function safeJson(text,fallback){try{return text==null?fallback:JSON.parse(text)}catch{return fallback}}

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

    this.ensureTaskColumns();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_queue_priority ON tasks(status, priority DESC, created_at ASC)").run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_upstream_id ON tasks(upstream_task_id)").run();
    this.recoverInterruptedTasks();
  }

  ensureTaskColumns(){
    const cols=new Set(this.db.prepare('PRAGMA table_info(tasks)').all().map(x=>x.name));
    const additions={
      priority:"INTEGER NOT NULL DEFAULT 50",
      provider_status:"TEXT NOT NULL DEFAULT ''",
      result_status:"TEXT NOT NULL DEFAULT ''",
      upstream_task_id:"TEXT",
      provider_output_json:"TEXT",
      provider_succeeded_at:"TEXT",
      result_saved_at:"TEXT",
      last_poll_at:"TEXT",
      last_error:"TEXT"
    };
    for(const [name,ddl] of Object.entries(additions)){
      if(!cols.has(name))this.db.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${ddl}`);
    }
  }

  recoverInterruptedTasks(){
    const now=nowIso();
    // A user-requested cancellation must stay cancelled after a restart.
    this.db.prepare("UPDATE tasks SET status='canceled', cancel_requested=1, updated_at=? WHERE status='cancelling'").run(now);
    // Everything else is resumable from SQLite. runTask reads payload._upstream and
    // continues polling the already-created provider task instead of creating a new one.
    const marks=RECOVERABLE_ACTIVE_STATUSES.map(()=>'?').join(',');
    this.db.prepare(`UPDATE tasks SET status='queued', progress=MIN(progress, 20), cancel_requested=0, updated_at=? WHERE status IN (${marks})`).run(now,...RECOVERABLE_ACTIVE_STATUSES);
  }

  parseTask(row) {
    if (!row) return null;
    return {
      id: row.id, status: row.status, progress: Number(row.progress || 0),
      providerId: row.provider_id, modelId: row.model_id, nodeType: row.node_type,
      payload: safeJson(row.payload_json, {}), output: safeJson(row.output_json, null), error: row.error || null,
      createdAt: row.created_at, updatedAt: row.updated_at, attempt: Number(row.attempt || 0),
      maxRetries: Number(row.max_retries || 0), cancelRequested: Boolean(row.cancel_requested), priority:Number(row.priority??50),
      logs: safeJson(row.logs_json, []),
      providerStatus: row.provider_status || '',
      resultStatus: row.result_status || '',
      upstreamTaskId: row.upstream_task_id || '',
      providerOutput: safeJson(row.provider_output_json, null),
      providerSucceededAt: row.provider_succeeded_at || null,
      resultSavedAt: row.result_saved_at || null,
      lastPollAt: row.last_poll_at || null,
      lastError: row.last_error || null
    };
  }

  createTask(t) {
    const payload=t.payload||{};
    const upstreamTaskId=String(t.upstreamTaskId||payload?._upstream?.id||'');
    this.db.prepare(`INSERT INTO tasks(
      id,status,progress,provider_id,model_id,node_type,payload_json,output_json,error,created_at,updated_at,
      attempt,max_retries,cancel_requested,logs_json,priority,provider_status,result_status,upstream_task_id,
      provider_output_json,provider_succeeded_at,result_saved_at,last_poll_at,last_error
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      t.id, t.status || 'queued', Number(t.progress || 0), t.providerId, t.modelId, t.nodeType,
      JSON.stringify(payload), t.output ? JSON.stringify(t.output) : null, t.error || null,
      t.createdAt, t.updatedAt, Number(t.attempt || 0), Number(t.maxRetries ?? 1), t.cancelRequested ? 1 : 0,
      JSON.stringify(t.logs || []), Math.max(0,Math.min(100,Number(t.priority??50))),
      String(t.providerStatus||''), String(t.resultStatus||''), upstreamTaskId||null,
      t.providerOutput==null?null:JSON.stringify(t.providerOutput), t.providerSucceededAt||null,
      t.resultSavedAt||null, t.lastPollAt||null, t.lastError||null
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

  guardedStatus(current, requested, patch={}){
    if(!requested)return current.status;
    // Success is terminal. A stale poller, timeout handler or retry callback must
    // never be able to turn a completed task back into failed/running/polling.
    if(current.status==='succeeded'&&requested!=='succeeded'&&patch.forceStatusReset!==true)return 'succeeded';
    // Once the provider has succeeded, later local/download/persistence problems
    // are result-processing problems, not generation failures.
    if(current.providerStatus==='succeeded'&&requested==='failed')return 'result_pending';
    return requested;
  }

  updateTask(id, patch={}) {
    const current=this.getTask(id); if(!current) return null;
    const next={...current,...patch,updatedAt:patch.updatedAt||nowIso()};
    next.status=this.guardedStatus(current,patch.status,next);

    const payload=patch.payload!==undefined?patch.payload:current.payload;
    next.upstreamTaskId=String(patch.upstreamTaskId ?? payload?._upstream?.id ?? current.upstreamTaskId ?? '');
    next.providerStatus=String(patch.providerStatus ?? current.providerStatus ?? '');
    next.resultStatus=String(patch.resultStatus ?? current.resultStatus ?? '');
    next.providerOutput=patch.providerOutput!==undefined?patch.providerOutput:current.providerOutput;
    next.providerSucceededAt=patch.providerSucceededAt!==undefined?patch.providerSucceededAt:current.providerSucceededAt;
    next.resultSavedAt=patch.resultSavedAt!==undefined?patch.resultSavedAt:current.resultSavedAt;
    next.lastPollAt=patch.lastPollAt!==undefined?patch.lastPollAt:current.lastPollAt;
    next.lastError=patch.lastError!==undefined?patch.lastError:(patch.error!==undefined?patch.error:current.lastError);

    if(next.status==='polling'&&!next.lastPollAt)next.lastPollAt=nowIso();
    if(next.status==='succeeded'){
      if(!next.providerStatus)next.providerStatus='succeeded';
      if(!next.providerSucceededAt)next.providerSucceededAt=nowIso();
      next.resultStatus='saved';
      if(!next.resultSavedAt)next.resultSavedAt=nowIso();
      next.lastError=null;
    }else if(next.status==='failed'&&next.providerStatus!=='succeeded'){
      if(!next.providerStatus)next.providerStatus='failed';
    }
    if(next.providerStatus==='succeeded'&&!next.providerSucceededAt)next.providerSucceededAt=nowIso();
    if(next.output!=null&&next.resultStatus==='')next.resultStatus=next.status==='succeeded'?'saved':'available';

    this.db.prepare(`UPDATE tasks SET
      status=?,progress=?,output_json=?,error=?,updated_at=?,attempt=?,max_retries=?,cancel_requested=?,logs_json=?,payload_json=?,priority=?,
      provider_status=?,result_status=?,upstream_task_id=?,provider_output_json=?,provider_succeeded_at=?,result_saved_at=?,last_poll_at=?,last_error=?
      WHERE id=?`).run(
      next.status, Number(next.progress||0), next.output==null?null:JSON.stringify(next.output), next.error||null, next.updatedAt,
      Number(next.attempt||0), Number(next.maxRetries||0), next.cancelRequested?1:0, JSON.stringify(next.logs||[]), JSON.stringify(payload||{}),
      Math.max(0,Math.min(100,Number(next.priority??50))), next.providerStatus||'', next.resultStatus||'', next.upstreamTaskId||null,
      next.providerOutput==null?null:JSON.stringify(next.providerOutput), next.providerSucceededAt||null, next.resultSavedAt||null,
      next.lastPollAt||null, next.lastError||null, id
    );
    return this.getTask(id);
  }

  appendTaskLog(id, message, level='info') {
    const t=this.getTask(id); if(!t)return null;
    const logs=[...(t.logs||[]),{at:nowIso(),level,message:String(message)}].slice(-250);
    return this.updateTask(id,{logs});
  }

  deleteTask(id) { return this.db.prepare('DELETE FROM tasks WHERE id=?').run(id).changes > 0; }

  createProject({id,name,data,createdAt,updatedAt}) {
    const now=createdAt||nowIso(); const upd=updatedAt||now; const version=1;
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
    const now=nowIso(); const text=JSON.stringify(data??p.data); const changed=text!==JSON.stringify(p.data);
    let version=p.version;
    if(changed || forceSnapshot) {
      version++;
      this.db.prepare('INSERT OR REPLACE INTO project_versions(project_id,version,data_json,created_at) VALUES(?,?,?,?)').run(id,version,text,now);
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

module.exports={CanvasStore};
