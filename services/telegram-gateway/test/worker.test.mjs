import test from 'node:test';
import assert from 'node:assert/strict';
import { mode, validate, secretMatches, authorized, intent, statusText, snapshotText, responseText } from '../src/core.mjs';
import { createWorker } from '../src/worker.mjs';

const secret = 'S'.repeat(48);
const env = {
  GMT_TELEGRAM_MODE: 'readonly',
  TELEGRAM_BOT_TOKEN: `123456789:${'A'.repeat(40)}`,
  TELEGRAM_WEBHOOK_SECRET: secret,
  TELEGRAM_ALLOWED_USER_ID: '12345678',
  GITHUB_READ_TOKEN: 'local-fixture-only', OPENAI_API_KEY: 'local-fixture-only'
};
const message = { chat: { type: 'private', id: 12345678 }, from: { id: 12345678, is_bot: false }, text: '/help' };
const update = { update_id: 4, message };
const request = (data = update, secretHeader = secret, path = '/telegram/webhook', method = 'POST') =>
  new Request(`https://worker.example${path}`, { method,
    headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secretHeader },
    ...(method === 'POST' ? { body: JSON.stringify(data) } : {}) });
const ctx = () => { const tasks = []; return { tasks, waitUntil(p) { tasks.push(p); } }; };
const remote = async (url) => {
  if (url.includes('/sendMessage')) return Response.json({ ok: true, result: {} });
  if (url.includes('/git/ref/heads/main')) return Response.json({ object: { sha: 'abcdef123456' } });
  if (url.includes('/pulls?')) return Response.json([{ number: 2, title: 'Telegram PR', draft: true, head: { sha: '1234567890' } }]);
  if (url.includes('/contents/docs/WORKBOARD.md')) return Response.json({ encoding: 'base64', content: btoa('# Workboard') });
  if (url.includes('/v1/responses')) return Response.json({ output: [{ content: [{ type: 'output_text', text: 'Baik, belum deploy.' }] }] });
  throw new Error('Unexpected request');
};

test('fail-closed modes, secrets and owner ID', () => {
  assert.equal(mode({}), 'off');
  assert.equal(mode({ GMT_TELEGRAM_MODE: 'invalid' }), 'off');
  assert.equal(validate(env, 'readonly'), true);
  assert.equal(validate({ ...env, TELEGRAM_ALLOWED_USER_ID: '' }, 'readonly'), false);
  assert.equal(validate({ ...env, OPENAI_API_KEY: '' }, 'readonly'), false);
  assert.equal(validate({ GMT_TELEGRAM_MODE: 'identity', TELEGRAM_WEBHOOK_SECRET: secret, TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN }, 'identity'), true);
  assert.equal(secretMatches(secret, secret), true);
  assert.equal(secretMatches(secret + 'A', secret), false);
  assert.equal(secretMatches(null, secret), false);
});

test('Telegram authorization requires private owner message', () => {
  assert.equal(authorized(message, '12345678'), true);
  assert.equal(authorized({ ...message, chat: { type: 'group', id: 12345678 } }, '12345678'), false);
  assert.equal(authorized({ ...message, from: { id: 123 } }, '12345678'), false);
});

test('intent recognizes read-only commands', () => {
  assert.deepEqual(intent('/status'), { name: 'status' });
  assert.deepEqual(intent('/ask cek progress'), { name: 'ask', query: 'cek progress' });
  assert.deepEqual(intent('lanjut'), { name: 'ask', query: 'lanjut' });
  assert.deepEqual(intent('/deploy production'), { name: 'unknown' });
});

test('no claim of verified hosting', () => {
  const x = { mainSha: '12345', prs: [], workboard: '' };
  assert.match(statusText(x), /BELUM DIPERIKSA/);
  assert.equal(JSON.parse(snapshotText(x)).hostingVerified, false);
  assert.equal(responseText({ output: [{ content: [{ type: 'output_text', text: 'OK' }] }] }), 'OK');
});

test('disabled / malformed / wrong route / invalid secret fail before network', async () => {
  const worker = createWorker(async () => { throw new Error('Network unexpectedly used'); });
  assert.equal((await worker.fetch(request(), { ...env, GMT_TELEGRAM_MODE: 'off' }, ctx())).status, 503);
  assert.equal((await worker.fetch(request({}, 'wrong'), env, ctx())).status, 403);
  assert.equal((await worker.fetch(request(update, secret, '/'), env, ctx())).status, 404);
  assert.equal((await worker.fetch(request(update, secret, '/telegram/webhook', 'GET'), env, ctx())).status, 405);
  const malformed = new Request('https://worker.example/telegram/webhook', { method: 'POST', headers: {
    'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret }, body: '{bad json' });
  assert.equal((await worker.fetch(malformed, env, ctx())).status, 400);
  const overlarge = request({ update_id: 4, message: { ...message, text: 'A'.repeat(20000) } });
  assert.equal((await worker.fetch(overlarge, env, ctx())).status, 400);
});

test('unauthorized accounts/groups cause no network requests', async () => {
  let requests = 0;
  const worker = createWorker(async () => { requests++; return Response.json({ ok: true }); });
  for (const changed of [
    { ...message, from: { id: 12345679 } },
    { ...message, chat: { id: -100000, type: 'group' } },
  ]) {
    const c = ctx(); const res = await worker.fetch(request({ update_id: 4, message: changed }), env, c);
    assert.equal(res.status, 200); await Promise.all(c.tasks);
  }
  assert.equal(requests, 0);
});

test('identity-only stage reveals only requester ID on /whoami', async () => {
  const urls = []; const worker = createWorker(async (url) => { urls.push(String(url)); return Response.json({ ok: true }); });
  const stage = { GMT_TELEGRAM_MODE: 'identity', TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET: secret };
  let c = ctx(); await worker.fetch(request({ update_id: 4, message: { ...message, text: '/status' } }), stage, c); await Promise.all(c.tasks);
  assert.equal(urls.length, 0);
  c = ctx(); await worker.fetch(request({ update_id: 5, message: { ...message, text: '/whoami' } }), stage, c); await Promise.all(c.tasks);
  assert.equal(urls.length, 1); assert.match(urls[0], /sendMessage/);
});

test('authorized /status fetches only fixed GitHub endpoints and sends Telegram reply', async () => {
  const urls = []; const worker = createWorker(async (url, init) => { urls.push(String(url)); return remote(String(url), init); });
  const c = ctx(); assert.equal((await worker.fetch(request({ update_id: 5, message: { ...message, text: '/status' } }), env, c)).status, 200);
  await Promise.all(c.tasks);
  assert.equal(urls.length, 4);
  assert.equal(urls.filter(u => u.includes('api.github.com')).length, 3);
  assert.equal(urls.filter(u => u.includes('api.openai.com')).length, 0);
});

test('authorized /ask sends one OpenAI request with store:false and no tools', async () => {
  let body; const worker = createWorker(async (url, init) => {
    if (String(url).includes('openai.com')) body = JSON.parse(init.body);
    return remote(String(url), init);
  });
  const c = ctx(); await worker.fetch(request({ update_id: 6, message: { ...message, text: '/ask status' } }), env, c); await Promise.all(c.tasks);
  assert.equal(body.store, false); assert.equal(body.tools, undefined);
  assert.match(body.input[0].content, /PERTANYAAN/);
});
