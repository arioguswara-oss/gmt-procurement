# GMT Procurement — Cloudflare Workers Telegram webhook

**STAGE: DRAFT / SOURCE ONLY / NOT DEPLOYED / DEFAULT OFF.** No VPS, no Hermes, no integration with Procurement production. Replaces earlier long-polling gateway design on PR #2.

## Scope

Cloudflare Worker receives Telegram webhook `POST /telegram/webhook`, verifies Telegram's `X-Telegram-Bot-Api-Secret-Token` and private Telegram user ID, then responds with `/help`, `/status`, `/ask`, `/whoami`. GitHub API calls are FIXED read-only endpoints to `arioguswara-oss/gmt-procurement`; AI uses OpenAI Responses API (`store:false`) with one-shot repo context, not ChatGPT chat history. Never commit credentials. No write permissions, code execution, merge, production database, Drive, WhatsApp, or SMTP.

**Worker modes:** `GMT_TELEGRAM_MODE=off` (default, responds 503); `identity` (ONLY `/whoami` in private Telegram chat after webhook secret verified; no GitHub/OpenAI access); `readonly` (requires owner numeric user ID and read-only GitHub/OpenAI keys). Unknown mode treated as off. `identity` is an explicit, temporary bootstrap option for learning Rio's Telegram numeric user ID. It is **not** a deployment authorization.

## Offline verification

Run in the `services/telegram-gateway` directory with Node.js >=22:

```sh
npm run check
npm test
```

Unit tests stub all external requests. Real Telegram, Cloudflare and OpenAI integration and GitHub CI remain separate verification gates. The Wrangler configuration is for future manual deployment; no install, binding or webhook registration happens as a result of this PR.

## Secret bindings (Cloudflare dashboard, NOT chat / GitHub)

- `TELEGRAM_BOT_TOKEN`: BotFather token.
- `TELEGRAM_WEBHOOK_SECRET`: separately generated, random 32-256 character A-Z/a-z/0-9/_/- string; set as Telegram `setWebhook` `secret_token` on explicit activation.
- `TELEGRAM_ALLOWED_USER_ID`: Rio's exact decimal Telegram private user ID (required for readonly).
- `GITHUB_READ_TOKEN`: **fine-grained GitHub token restricted to just `gmt-procurement`, Contents: Read and Pull requests: Read**, shortest practical expiration.
- `OPENAI_API_KEY`: project-specific OpenAI API key, set with spend limits.
- `OPENAI_MODEL`: optional non-secret string (defaults to `gpt-4.1-mini` subject to model access).

Do not place any secret in wrangler vars or upload it here. Access via Cloudflare Worker environment secret bindings (official Cloudflare guidance). Avoid attaching existing GitHub application tokens with write permissions.

## Controlled activation plan — REQUIRES SEPARATE RIO APPROVAL

1. Rio creates/logs in to a Cloudflare account, prepares a Worker with **automatic GitHub deploy disabled** (do not connect the repo to automatic production deployment). The source branch is DRAFT until checks and approval.
2. Provision protected secret bindings in Cloudflare dashboard; verify origin of `TELEGRAM_ALLOWED_USER_ID`. Optionally briefly enable `identity` mode for private `/whoami` only to obtain the ID, then switch off.
3. Verify pricing/budgets, webhook URL, callback signature, uptime and rollback procedure. Security policy must explicitly approve transfer of selected private GitHub workboard metadata and owner queries to the OpenAI API.
4. After Rio explicitly approves external activation, deploy a Worker with `GMT_TELEGRAM_MODE=readonly`. Manually register HTTPS webhook via Telegram `setWebhook` with matching secret token, `allowed_updates=["message"]`, `max_connections=1`, and **no** `drop_pending_updates`. Do not include token in logs, tickets, URLs or screenshots.
5. Smoke test authorized/unauthorized Telegram accounts and tests for webhook rejection; verify OpenAI/GitHub billing controls, then record HOSTING VERIFIED only with evidence. To disable: set Worker mode `off` and separately review webhook revocation/rollback. Do not silently modify any existing Telegram webhook.

## Limitations

This minimal prototype processes updates best-effort using Cloudflare `ctx.waitUntil()`. The webhook acknowledges before sending; a crash or slow upstream can cause a lost response, and duplicate Telegram deliveries can create duplicate replies/AI costs. There is no persistent history, queue, globally enforced throttle, exactly-once processing, continuous background work or task execution. Cloudflare's `waitUntil` has a limited lifetime (currently up to 30s); use Queues + Durable Objects for stronger delivery/dedup in an approved later phase. Do not market as production-ready before those trade-offs are accepted. `store:false` does not imply zero retention at OpenAI.

## Lane & status (2026-10-19)

P1-TELEGRAM-GATEWAY | Owner ChatGPT | DONE_SOURCE pending review | Ownership `services/telegram-gateway/**` and dedicated `.github/workflows/telegram-gateway.yml`. Separate from PR #1 (foundation audit) and all Procurement modules.

- Overall Source/Foundation: Standalone Cloudflare webhook design and code; Procurement app import unaffected.
- Module Progress: webhook core implemented and offline tests prepared.
- Source/Test: local syntax and offline tests recorded in PR comments. GitHub CI failure from previous commit still needs independent diagnosis.
- Hosting Verification: NOT VERIFIED.
- Deploy Readiness: NOT READY.
- LOCK: NO.
