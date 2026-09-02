from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)

registry = ROOT / 'video-protocol-registry.js'
src = registry.read_text(encoding='utf-8')
src = replace_once(
    src,
    "const body={model:'MiniMax-H3',group:'特惠视频生成',prompt,duration,ratio};",
    "const body={model:'MiniMax-H3',prompt,duration,ratio,group:'discount_video_generation',n:1};",
    'restore known-working XOGPU envelope',
)
registry.write_text(src, encoding='utf-8')

test_file = ROOT / 'tests' / 'xogpu-minimax-h3.test.mjs'
src = test_file.read_text(encoding='utf-8')
src = replace_once(
    src,
    "assert.deepEqual(mapped.body,{model:'MiniMax-H3',group:'特惠视频生成',prompt:'cinematic ocean',duration:5,ratio:'16:9'});",
    "assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'cinematic ocean',duration:5,ratio:'16:9',group:'discount_video_generation',n:1});",
    'restore text-to-video regression expectation',
)
test_file.write_text(src, encoding='utf-8')
