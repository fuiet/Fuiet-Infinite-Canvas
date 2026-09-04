import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill=fs.readFileSync(new URL('../script-node-skill-pack-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const docs=fs.readFileSync(new URL('../internal-skills/script-node/README.md',import.meta.url),'utf8');

test('built-in script skill runtime parses as JavaScript',()=>{
  assert.doesNotThrow(()=>new Function(skill));
});

test('skill pack loads before app.js so it can upgrade script task orchestration',()=>{
  assert.match(bootstrap,/const v='20260904-script-skill-pack-1'/);
  assert.match(bootstrap,/script-workflow-core\.js\?v=\$\{v\}[\s\S]*script-node-skill-pack-v1\.js\?v=\$\{v\}[\s\S]*app\.js\?v=\$\{v\}/);
  assert.match(index,/browser-bootstrap\.js\?v=20260904-script-skill-pack-1/);
});

test('script breakdown uses owner-style write assets storyboard review passes',()=>{
  for(const name of ['short-drama-write','short-drama-assets','short-drama-storyboard','short-drama-video-prompts','short-drama-review'])assert.ok(skill.includes(name));
  for(const op of ['script_skill_write','script_skill_assets','script_skill_storyboard','script_skill_review'])assert.ok(skill.includes(op));
  assert.match(skill,/op==='script_breakdown'/);
  assert.match(skill,/runPipeline\(v,collectionUrl,body,init\)/);
  assert.match(skill,/complete-fallback/);
});

test('storyboard contract protects source facts and continuity',()=>{
  assert.ok(skill.includes('你只能决定“怎么拍”，不能决定“发生什么”'));
  assert.ok(skill.includes('起点：…；主要动作：…；终点：…'));
  assert.ok(skill.includes('人物位置、朝向、视线、双手、持物和道具状态不能镜外瞬移'));
  assert.ok(skill.includes('匿名路人、顾客群、一次性服务员等 functional 人物默认不建角色资产'));
});

test('prompt synthesis is constrained by image/video prompt owners',()=>{
  assert.match(skill,/op==='prompt_synthesis'/);
  assert.ok(skill.includes('imagePrompt 是静态起始帧'));
  assert.ok(skill.includes('videoPrompt 必须从已确认起点走到已确认终点'));
  assert.ok(skill.includes('对白\/旁白保持原文且在本镜只出现一次'));
});

test('local quality gate remains deterministic and external skills are attribution-only',()=>{
  assert.match(skill,/function deterministicCheck\(result\)/);
  assert.match(skill,/镜头\$\{i\+1\}缺少可视化动作/);
  assert.match(skill,/Number\(s\.duration\)>0&&Number\(s\.duration\)<=15/);
  assert.match(docs,/zenstory-ai\/drama-skills/);
  assert.match(docs,/eternityspring\/shuohao-skills/);
  assert.match(docs,/运行时不依赖外部 GitHub 仓库/);
});
