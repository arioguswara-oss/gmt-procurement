import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledConfig, isAuthorized, interpret, telegramText, projectStatus,
  cleanSnapshot, openaiOutput, REPO } from '../src/core.mjs';

const token = `123456789:${'A'.repeat(35)}`;
const goodEnv = {
  GMT_TELEGRAM_ENABLED: 'true', TELEGRAM_BOT_TOKEN: token,
  TELEGRAM_ALLOWED_USER_ID: '12345678', GITHUB_READ_TOKEN: 'fake-for-unit-tests-only',
  OPENAI_API_KEY: 'fake-for-unit-tests-only',
};
const privateMessage = { chat: { type: 'private', id: 12345678 }, from: { id: 12345678, is_bot: false }, text: '/status' };

test('gateway is disabled unless explicitly enabled', () => {
  assert.throws(() => enabledConfig({ ...goodEnv, GMT_TELEGRAM_ENABLED: 'false' }), /disabled/);
  assert.throws(() => enabledConfig({ ...goodEnv, GMT_TELEGRAM_ENABLED: undefined }), /disabled/);
});

test('configuration validates secret presence and owner ID', () => {
  assert.throws(() => enabledConfig({ ...goodEnv, OPENAI_API_KEY: '' }), /OPENAI_API_KEY/);
  assert.throws(() => enabledConfig({ ...goodEnv, TELEGRAM_ALLOWED_USER_ID: 'someone' }), /Invalid Telegram user ID/);
  assert.throws(() => enabledConfig({ ...goodEnv, TELEGRAM_BOT_TOKEN: 'invalid' }), /Invalid bot token/);
  const config = enabledConfig(goodEnv);
  assert.equal(config.allowedUserId, '12345678');
  assert.equal(config.model, 'gpt-4.1-mini');
});

test('authorization requires private chat AND exact numeric user and chat IDs', () => {
  assert.equal(isAuthorized(privateMessage, '12345678'), true);
  assert.equal(isAuthorized({ ...privateMessage, from: { id: 999 } }, '12345678'), false);
  assert.equal(isAuthorized({ ...privateMessage, chat: { type: 'group', id: 12345678 } }, '12345678'), false);
  assert.equal(isAuthorized({ ...privateMessage, chat: { type: 'private', id: 9 } }, '12345678'), false);
  assert.equal(isAuthorized({ ...privateMessage, from: { id: 12345678, is_bot: true } }, '12345678'), false);
  assert.equal(isAuthorized(undefined, '12345678'), false);
});

test('commands do not turn normal discussion into write operations', () => {
  assert.deepEqual(interpret('/status'), { command: 'status' });
  assert.deepEqual(interpret('/help@GMTProcurementBot'), { command: 'help' });
  assert.deepEqual(interpret('/whoami'), { command: 'whoami' });
  assert.deepEqual(interpret('/unknown delete all'), { command: 'unknown' });
  assert.deepEqual(interpret('lanjut'), { command: 'ask', query: 'lanjut' });
  assert.deepEqual(interpret('/ask audit terbaru'), { command: 'ask', query: 'audit terbaru' });
});

test('long input and output truncated before calling services', () => {
  assert.equal(interpret('a'.repeat(9000)).query.length, 1800);
  assert.equal(telegramText('x'.repeat(9000)).length, 3900);
  assert.equal(telegramText(null).includes('Jawaban kosong'), true);
});

test('GitHub status is source-specific and never claims hosting verified', () => {
  const s = projectStatus({ mainSha: 'abcdefabcdeffedc', pullRequests: [
    { number: 2, draft: true, title: 'Audit source', sha: '1234567890123' },
  ], workboard: '# Workboard' });
  assert.match(s, new RegExp(REPO));
  assert.match(s, /\[DRAFT\]/);
  assert.match(s, /TIDAK diperiksa/);
  const context = cleanSnapshot({ mainSha: 'abc', pullRequests: [], workboard: 'task' });
  assert.equal(JSON.parse(context).hostingVerified, false);
});

test('extract OpenAI Responses text only', () => {
  assert.equal(openaiOutput({ output: [
    { type: 'reasoning', content: [] },
    { type: 'message', content: [{ type: 'output_text', text: 'Halo' }, { type: 'refusal', refusal: 'no' }] },
  ] }), 'Halo');
  assert.equal(openaiOutput({}), '');
});
