from pathlib import Path

p=Path('scripts/patch-script-editor-simplified.py')
s=p.read_text(encoding='utf-8')
start=s.index('# Keep only the three production steps in the workflow header.')
end=s.index('# Add compact visual-description helpers before the shots table renderer.')
replacement='''# Keep only the three production steps in the workflow header.\nreplace_once(app,\n"""    return `<div class=\\"script-workflow-head\\"><div class=\\"script-workflow-steps\\">${steps.map(x=>`<button data-script-tab=\\"${x.tab}\\" class=\\"script-step ${tab===x.tab?'active':''} ${x.done?'done':''}\\"><i>${x.done?'✓':x.no}</i><span><b>${x.title}</b><small>${x.meta}</small></span></button>`).join('<em></em>')}</div><div class=\\"script-workflow-progress\\">${s.promptsReady?'3/3 完成，可进入批量生产':s.assetsReady?'2/3 已完成':s.shotsConfirmed?'1/3 已完成':'请从确认镜头开始'}</div></div>`;\n""",\n"""    return `<div class=\\"script-workflow-head simplified\\"><div class=\\"script-workflow-steps\\">${steps.map(x=>`<button data-script-tab=\\"${x.tab}\\" class=\\"script-step ${tab===x.tab?'active':''} ${x.done?'done':''}\\"><i>${x.done?'✓':x.no}</i><span><b>${x.title}</b><small>${x.meta}</small></span></button>`).join('<em></em>')}</div></div>`;\n""",\n'workflow header simplification')\n\n'''
p.write_text(s[:start]+replacement+s[end:],encoding='utf-8')
