import worker from '../../dist/server/auth-entry.js';

export async function onRequest(context) {
  return worker.fetch(context.request, context.env, context);
}
