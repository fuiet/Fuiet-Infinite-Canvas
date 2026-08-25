import worker from '../../dist/server/production-entry.js';

export async function onRequest(context) {
  return worker.fetch(context.request, context.env, context);
}
