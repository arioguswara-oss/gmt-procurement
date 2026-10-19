// Run after API build. No app bootstrap, database, network or real credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { validateEnvironment } = require('../apps/api/dist/config/env.validation');
const { JwtAuthGuard } = require('../apps/api/dist/common/guards/jwt-auth.guard');
const { RolesGuard } = require('../apps/api/dist/common/guards/roles.guard');
const env = () => ({ NODE_ENV: 'test', DATABASE_URL: 'mysql://localhost:1/unreachable_test', JWT_SECRET: 'x'.repeat(40), WEB_ORIGIN: 'http://localhost', PDF_SERVER_ENABLED: 'false' });
const context = request => ({ switchToHttp: () => ({ getRequest: () => request }), getHandler: () => null, getClass: () => null });
test('environment rejects absent database configuration', () => { const e = env(); delete e.DATABASE_URL; assert.throws(() => validateEnvironment(e)); });
test('environment rejects weak non-development signing secret', () => { assert.throws(() => validateEnvironment({ ...env(), JWT_SECRET: 'short' })); });
test('environment rejects invalid upload limit', () => { assert.throws(() => validateEnvironment({ ...env(), MAX_UPLOAD_MB: '-1' })); });
test('PDF disabled configuration requires no browser', () => { assert.equal(validateEnvironment(env()).PDF_SERVER_ENABLED, 'false'); });
test('JWT guard rejects missing token before database lookup', async () => { const g = new JwtAuthGuard({}, { user: { findUnique: () => assert.fail('unexpected DB lookup') } }); await assert.rejects(g.canActivate(context({ headers: {} })), { status: 401 }); });
test('JWT guard rejects invalid signature before database lookup', async () => { const g = new JwtAuthGuard({ verifyAsync: async () => { throw Error('invalid'); } }, { user: { findUnique: () => assert.fail('unexpected DB lookup') } }); await assert.rejects(g.canActivate(context({ headers: { authorization: 'Bearer synthetic' } })), { status: 401 }); });
test('JWT guard rejects inactive user with mocked database', async () => { const g = new JwtAuthGuard({ verifyAsync: async () => ({ sub: '1' }) }, { user: { findUnique: async () => ({ active: false }) } }); await assert.rejects(g.canActivate(context({ headers: { authorization: 'Bearer synthetic' } })), { status: 401 }); });
test('JWT guard attaches active user from mocked database', async () => { const user = { id: 1n, active: true, role: 'ADMIN' }; const request = { headers: { authorization: 'Bearer synthetic' } }; const g = new JwtAuthGuard({ verifyAsync: async () => ({ sub: '1' }) }, { user: { findUnique: async () => user } }); assert.equal(await g.canActivate(context(request)), true); assert.equal(request.user, user); });
test('role guard denies wrong role', () => { const g = new RolesGuard({ getAllAndOverride: () => ['SUPER_ADMIN'] }); assert.equal(g.canActivate(context({ user: { role: 'FINANCE' } })), false); });
test('role guard permits authorized role', () => { const g = new RolesGuard({ getAllAndOverride: () => ['ADMIN'] }); assert.equal(g.canActivate(context({ user: { role: 'ADMIN' } })), true); });
