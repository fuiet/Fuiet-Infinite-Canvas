from pathlib import Path
import re

TARGET = Path(__file__).with_name('fix-video-zero-config-v2.py')
source = TARGET.read_text(encoding='utf-8')

replacement = r'''def replace_function(text, marker, new_code):
    start=text.find(marker)
    if start<0: raise SystemExit(f'function marker not found: {marker}')
    paren=text.find('(',start)
    if paren<0: raise SystemExit(f'function parameters not found: {marker}')
    depth=0;state='normal';quote='';i=paren
    signature_end=-1
    while i<len(text):
        c=text[i];n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal';i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal';quote=''
        else:
            if c in "'\"`": state='string';quote=c
            elif c=='/' and n=='/': state='line';i+=1
            elif c=='/' and n=='*': state='block';i+=1
            elif c=='(': depth+=1
            elif c==')':
                depth-=1
                if depth==0:
                    signature_end=i
                    break
        i+=1
    if signature_end<0: raise SystemExit(f'function signature not closed: {marker}')
    brace=text.find('{',signature_end+1)
    if brace<0: raise SystemExit(f'opening brace not found: {marker}')
    depth=0;i=brace;state='normal';quote=''
    while i<len(text):
        c=text[i];n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal';i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal';quote=''
        else:
            if c in "'\"`": state='string';quote=c
            elif c=='/' and n=='/': state='line';i+=1
            elif c=='/' and n=='*': state='block';i+=1
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:
                    return text[:start]+new_code+text[i+1:]
        i+=1
    raise SystemExit(f'unclosed function: {marker}')
'''

patched, count = re.subn(
    r"def replace_function\(text, marker, new_code\):.*?\n# ---- Shared contract:",
    replacement + "\n# ---- Shared contract:",
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit(f'could not patch replace_function helper; matches={count}')

exec(compile(patched, str(TARGET), 'exec'), {'__file__': str(TARGET), '__name__': '__main__'})
