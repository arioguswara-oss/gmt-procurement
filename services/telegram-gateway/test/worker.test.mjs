import test from 'node:test';
import assert from 'node:assert/strict';
import { mode, validate, secretMatches, authorized, intent, statusText, snapshotText, responseText } from '../src/core.mjs';
import { createWorker as modularWorker, jsonFetch } from '../src/worker.mjs';
import { createWorker as bundledWorker } from '../cloudflare-single-file.mjs';
import { safeDiagnostic } from '../src/core.mjs';
import { readFileSync } from 'node:fs';
import { buildBundle } from '../scripts/build-single-file.mjs';

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

for (const [distribution, createWorker] of [['modular', modularWorker], ['single-file', bundledWorker]]) {
const originalTest = test;
const suiteTest = (name, fn) => originalTest(distribution + ': ' + name, fn);
suiteTest('fail-closed modes, secrets and owner ID', () => {
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

suiteTest('Telegram authorization requires private owner message', () => {
  assert.equal(authorized(message, '12345678'), true);
  assert.equal(authorized({ ...message, chat: { type: 'group', id: 12345678 } }, '12345678'), false);
  assert.equal(authorized({ ...message, from: { id: 123 } }, '12345678'), false);
});

suiteTest('intent recognizes read-only commands', () => {
  assert.deepEqual(intent('/status'), { name: 'status' });
  assert.deepEqual(intent('/ask cek progress'), { name: 'ask', query: 'cek progress' });
  assert.deepEqual(intent('lanjut'), { name: 'ask', query: 'lanjut' });
  assert.deepEqual(intent('/deploy production'), { name: 'unknown' });
});

suiteTest('no claim of verified hosting', () => {
  const x = { mainSha: '12345', prs: [], workboard: '' };
  assert.match(statusText(x), /BELUM DIPERIKSA/);
  assert.equal(JSON.parse(snapshotText(x)).hostingVerified, false);
  assert.equal(responseText({ output: [{ content: [{ type: 'output_text', text: 'OK' }] }] }), 'OK');
});

suiteTest('disabled / malformed / wrong route / invalid secret fail before network', async () => {
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

suiteTest('unauthorized accounts/groups cause no network requests', async () => {
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

suiteTest('identity-only stage reveals only requester ID on /whoami', async () => {
  const urls = []; const worker = createWorker(async (url) => { urls.push(String(url)); return Response.json({ ok: true }); });
  const stage = { GMT_TELEGRAM_MODE: 'identity', TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET: secret };
  let c = ctx(); await worker.fetch(request({ update_id: 4, message: { ...message, text: '/status' } }), stage, c); await Promise.all(c.tasks);
  assert.equal(urls.length, 0);
  c = ctx(); await worker.fetch(request({ update_id: 5, message: { ...message, text: '/whoami' } }), stage, c); await Promise.all(c.tasks);
  assert.equal(urls.length, 1); assert.match(urls[0], /sendMessage/);
});

suiteTest('authorized /status fetches only fixed GitHub endpoints and sends Telegram reply', async () => {
  const urls = []; const worker = createWorker(async (url, init) => { urls.push(String(url)); return remote(String(url), init); });
  const c = ctx(); assert.equal((await worker.fetch(request({ update_id: 5, message: { ...message, text: '/status' } }), env, c)).status, 200);
  await Promise.all(c.tasks);
  assert.equal(urls.length, 4);
  assert.equal(urls.filter(u => u.includes('api.github.com')).length, 3);
  assert.equal(urls.filter(u => u.includes('api.openai.com')).length, 0);
});

suiteTest('authorized /ask sends one OpenAI request with store:false and no tools', async () => {
  let body; const worker = createWorker(async (url, init) => {
    if (String(url).includes('openai.com')) body = JSON.parse(init.body);
    return remote(String(url), init);
  });
  const c = ctx(); await worker.fetch(request({ update_id: 6, message: { ...message, text: '/ask status' } }), env, c); await Promise.all(c.tasks);
  assert.equal(body.store, false); assert.equal(body.tools, undefined);
  assert.match(body.input[0].content, /PERTANYAAN/);
});

for (const [endpoint, operation, command] of [
  ['/git/ref/', 'GITHUB_REF', '/status'],
  ['/pulls?', 'GITHUB_PULLS', '/ask local-private-question'],
  ['/v1/responses', 'OPENAI_RESPONSES', '/ask local-private-question'],
]) {
  for (const [status, headers, category] of [
    [401, {}, 'UNAUTHORIZED'], [403, {}, 'FORBIDDEN'], [404, {}, 'NOT_FOUND'],
    [429, {}, 'RATE_LIMIT'], [403, {'x-ratelimit-remaining':'0'}, 'RATE_LIMIT'],
    [403, {'retry-after':'1'}, 'RATE_LIMIT'], [408, {}, 'TIMEOUT'],
    [504, {}, 'TIMEOUT'], [500, {}, 'UPSTREAM'], [422, {}, 'HTTP_ERROR'],
    ['network', {}, 'NETWORK'], ['timeout', {}, 'TIMEOUT'],
    ['bad-json', {}, 'INVALID_RESPONSE'], ['bad-shape', {}, 'INVALID_RESPONSE'],
  ]) {
    suiteTest(operation + ' safely diagnoses ' + status + ' ' + category, async () => {
      const replies = [], logs = [], calls = [];
      const oldWarn = console.warn;
      console.warn = value => logs.push(value);
      try {
        const worker = createWorker(async (url, init) => {
          calls.push(url);
          if (url.includes('/sendMessage')) {
            replies.push(JSON.parse(init.body).text);
            return Response.json({ok:true});
          }
          if (!url.includes(endpoint)) return remote(url, init);
          if (status === 'network') throw new TypeError('secret-url-token-private-body');
          if (status === 'timeout') throw new DOMException('secret-url-token-private-body', 'TimeoutError');
          if (status === 'bad-json') return new Response('secret-url-token-private-body');
          if (status === 'bad-shape') return Response.json({});
          return new Response('secret-url-token-private-body', {status, headers});
        });
        const c = ctx();
        assert.equal((await worker.fetch(request({update_id:8, message:{...message,text:command}}), env, c)).status,200);
        await Promise.all(c.tasks);
        assert.equal(replies.length,1);
        assert.match(replies[0], new RegExp(operation + '_' + category));
        assert.deepEqual(logs.map(JSON.parse), [{event:'gmt_gateway_failure',code:operation + '_' + category}]);
        const evidence = JSON.stringify({replies,logs});
        for (const secretValue of ['secret-url-token-private-body','local-private-question',env.TELEGRAM_BOT_TOKEN,
          env.GITHUB_READ_TOKEN, env.TELEGRAM_ALLOWED_USER_ID, 'https://']) assert.equal(evidence.includes(secretValue),false);
        if (operation.startsWith('GITHUB')) assert.equal(calls.some(u => u.includes('openai.com')),false);
      } finally { console.warn = oldWarn; }
    });
  }
}
suiteTest('optional workboard failure is diagnosed without blocking status', async () => {
  const logs=[], replies=[]; const oldWarn=console.warn; console.warn=x=>logs.push(JSON.parse(x));
  try {
    const worker=createWorker(async (url,init)=>{
      if(url.includes('/contents/')) return new Response('private body',{status:404});
      if(url.includes('/sendMessage')) replies.push(JSON.parse(init.body).text);
      return remote(url,init);
    });
    const c=ctx(); await worker.fetch(request({update_id:8,message:{...message,text:'/status'}}),env,c);
    await Promise.all(c.tasks);
    assert.deepEqual(logs,[{event:'gmt_gateway_failure',code:'GITHUB_WORKBOARD_NOT_FOUND'}]);
    assert.match(replies[0],/tidak tersedia/);
  } finally {console.warn=oldWarn;}
});
suiteTest('Telegram delivery failure is sanitized and retries only once', async () => {
  const logs=[]; let sends=0; const oldWarn=console.warn; console.warn=x=>logs.push(JSON.parse(x));
  try {
    const worker=createWorker(async ()=>{sends++;throw new Error('bot-url-with-secret-and-pii');});
    const c=ctx();await worker.fetch(request(),env,c);await Promise.all(c.tasks);
    assert.equal(sends,2);
    assert.deepEqual(logs,Array(2).fill({event:'gmt_gateway_failure',code:'TELEGRAM_SEND_NETWORK'}));
  } finally {console.warn=oldWarn;}
});
}
test('unknown errors cannot inject diagnostic content',()=>{
  for(const error of [new Error('secret'),{code:'GITHUB_REF_UNAUTHORIZED',message:'private'},null,'private'])
    assert.equal(safeDiagnostic(error),'INTERNAL_ERROR');
});
test('deadline covers hung fetch and hung JSON body without relying on fetch abort support',async()=>{
  for(const fetchImpl of [()=>new Promise(()=>{}),async()=>({ok:true,json:()=>new Promise(()=>{})})]) {
    await assert.rejects(jsonFetch(fetchImpl,'GITHUB_REF','https://fixture.invalid',{},10),
      error=>safeDiagnostic(error)==='GITHUB_REF_TIMEOUT' && !error.cause);
  }
});
test('HTTP errors never read or log upstream body',async()=>{
  let reads=0;
  await assert.rejects(jsonFetch(async()=>({ok:false,status:401,headers:new Headers(),
    json(){reads++;throw new Error('secret');}}),'OPENAI_RESPONSES','https://fixture.invalid',{}),
    error=>safeDiagnostic(error)==='OPENAI_RESPONSES_UNAUTHORIZED');
  assert.equal(reads,0);
});
test('single-file distribution exactly matches generated modular source',()=>{
  const core=readFileSync(new URL('../src/core.mjs',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../src/worker.mjs',import.meta.url),'utf8');
  assert.equal(readFileSync(new URL('../cloudflare-single-file.mjs',import.meta.url),'utf8'),buildBundle(core,worker));
});
