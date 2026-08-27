from pathlib import Path

TEST = Path(__file__).resolve().parents[1] / 'tests' / 'provider-save-auto-discovery.test.mjs'
s = TEST.read_text(encoding='utf-8')
s = s.replace("let authSeen='';let xApiKeySeen='';", "let bearerWasTried=false;let xApiKeySeen='';", 1)
s = s.replace("authSeen=String(req.headers.authorization||'');xApiKeySeen=String(req.headers['x-api-key']||'');", "const authSeen=String(req.headers.authorization||'');if(authSeen.startsWith('Bearer '))bearerWasTried=true;xApiKeySeen=String(req.headers['x-api-key']||'');", 1)
s = s.replace("assert.equal(authSeen.startsWith('Bearer '),true,'Bearer is tried before x-api-key');", "assert.equal(bearerWasTried,true,'Bearer is tried before x-api-key');", 1)
TEST.write_text(s, encoding='utf-8')
print('Fixed auth fallback regression assertion.')
