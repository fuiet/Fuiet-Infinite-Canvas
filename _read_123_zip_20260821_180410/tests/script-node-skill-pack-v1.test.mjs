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

test('safe skill pack loads before app.js',()=>{
  assert.match(bootstrap,/script-workflow-core\.js\?v=\$\{v\}[\s\S]*script-node-skill-pack-v1\.js\?v=\$\{v\}[\s\S]*app\.js\?v=\$\{v\}/);
  assert.match(index,/browser-bootstrap\.js\?v=/);
});

test('script breakdown keeps the proven native task lifecycle',()=>{
  assert.match(skill,/op==='script_breakdown'/);
  assert.match(skill,/operation:'script_breakdown'/);
  assert.match(skill,/skillMode:'single-task-safe'/);
  assert.doesNotMatch(skill,/virtualTasks/);
  assert.doesNotMatch(skill,/runPipeline\(/);
  assert.doesNotMatch(skill,/script_skill_write/);
});

test('built-in story asset storyboard review rules are still embedded',()=>{
  for(const name of ['short-drama-write','short-drama-assets','short-drama-storyboard','short-drama-review'])assert.ok(skill.includes(name));
  assert.ok(skill.includes('你只能决定“怎么拍”，不能决定“发生什么”'));
  assert.ok(skill.includes('起点：……；主要动作：……；终点：……'));
  assert.ok(skill.includes('人物位置、朝向、视线、双手、持物、伤势和道具状态不能镜外瞬移'));
  assert.ok(skill.includes('匿名路人、顾客群、一次性服务员、背景人群默认不要建立角色资产'));
});

test('prompt synthesis stays constrained by image/video prompt owners',()=>{
  assert.match(skill,/op==='prompt_synthesis'/);
  assert.ok(skill.includes('imagePrompt = 静态起始帧'));
  assert.ok(skill.includes('videoPrompt = 静态锚点 → 起点 → 唯一主要动作'));
  assert.ok(skill.includes('对白\/旁白保持原文并在本镜只出现一次'));
});

test('local deterministic gate and attribution documentation remain',()=>{
  assert.match(skill,/function deterministicCheck\(result\)/);
  assert.match(skill,/镜头\$\{i\+1\}缺少可视化动作/);
  assert.match(skill,/d>0&&d<=15/);
  assert.match(docs,/zenstory-ai\/drama-skills/);
  assert.match(docs,/eternityspring\/shuohao-skills/);
  assert.match(docs,/运行时不依赖外部 GitHub 仓库/);
});
