// Web preview entrypoint. Keeps server.js usable in local-only mode while making npm start internet-host friendly.
process.env.CANVAS_RUNTIME = process.env.CANVAS_RUNTIME || 'web';
process.env.HOST = process.env.HOST || '0.0.0.0';
require('./server.js');
