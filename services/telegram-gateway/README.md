# GMT Procurement Telegram AI gateway (standalone)

**STAGE: SOURCE WORK / DRAFT / NOT DEPLOYED / DEFAULT OFF.** No Hermes.
This is a separate Node >=22 long-polling gateway, not part of Procurement production, SANRO or the WordPress website.

## What works in source
- /help and /start: instructions.
- /status: read-only GitHub snapshot for arioguswara-oss/gmt-procurement (main SHA, open PR metadata, one fixed audit workboard).
- /ask or normal text: OpenAI Responses API discussion using a bounded snapshot and last four Q/A pairs held in RAM. This does not inherit ChatGPT's chat history, memory or connectors.
- /whoami: privately shows only the requester's own numeric Telegram user ID; used to configure owner allowlist.
- Any other user/group: ignored for project actions. Only the exact numeric approved Telegram user ID in its own private chat can receive project status/AI replies.
- Nothing writes GitHub; nothing emails, sends WhatsApp, reads Drive, touches Procurement DB, or deploys.

## Security and permissions
- Fail-closed startup: GMT_TELEGRAM_ENABLED=true is required; no live service has been enabled by this PR.
- Telegram token, OpenAI API key, and GitHub token must be supplied ONLY to an isolated gateway host's protected environment or secrets manager. Do not paste into this chat, Telegram, GitHub, screenshots or Google Drive.
- Fine-grained GITHUB_READ_TOKEN must be scoped to repo arioguswara-oss/gmt-procurement with **Contents: Read** and **Pull requests: Read** only, shortest practical expiration.
- Long polling requires no public inbound web server; an existing webhook causes startup refusal rather than automatic deletion.
- GitHub reads use a fixed allowlist of GET endpoints and no user-controlled repository URL. Workboard text and authorized questions are sent to the OpenAI API, so do not send credentials, customer personal data or private source code. The call requests store:false, which does **not** promise zero processing or retention.
- OpenAI model has NO tool access or function calls. A user instruction such as "lanjut" is discussion/handoff only, not authorization to alter source, hosting, mail, migration or Drive.
- Messages are shortened, AI queries throttled, conversation history RAM-only, and errors sanitized. Hosting should cap API spend independently. Restart may replay an unacknowledged Telegram update; no exactly-once guarantee.
- Drive, if separately approved in a later project, remains limited to Gayuh Mandala Storage Share ID 1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A; THIS gateway has no Drive integration.

## Offline tests
Run from services/telegram-gateway:
- node --version (>=22)
- npm run check
- npm test

No network/service integration is exercised in unit tests; do not call them hosting-verification evidence.

## Production-independent setup — NOT authorized by this PR
1. Rio confirms exact Telegram bot username and numeric personal user ID using a trusted lookup. The gateway requires that allowlist ID **before** full startup (do not start simply to obtain the ID).
2. Select a separate restricted gateway host (not Procurement production) and configure the secret environment variables:
   - TELEGRAM_BOT_TOKEN (BotFather secret)
   - TELEGRAM_ALLOWED_USER_ID (Rio's numeric Telegram ID)
   - GITHUB_READ_TOKEN (fine-grained, repo-limited READ-only)
   - OPENAI_API_KEY (budgeted/restricted project)
   - OPENAI_MODEL (optional; default gpt-4.1-mini, verify account access/pricing)
   - GMT_TELEGRAM_ENABLED (leave unset/false pending explicit approval)
3. Verify billing controls, owner ID, transport and outbound HTTPS permissions, current webhook settings, operational ownership, monitoring, manual rollback/shutdown and credentials handling.
4. **Only after explicit Rio approval:** launch off-production, smoke-test from allowed and denied Telegram accounts, record verified hosting evidence. Never merge or deploy automatically.

## Workboard checkpoint (2026-10-19)
Lane P1-TELEGRAM-GATEWAY; owner ChatGPT; status DONE_SOURCE pending PR review; ownership services/telegram-gateway/** plus dedicated CI workflow only. No edits to concurrent audit lane.
- Overall Source/Foundation: standalone bot source ready; Procurement app source import remains separate.
- Module Progress: Telegram gateway source implemented (not live).
- Source/Test Status: local syntax + 7 unit tests PASS; GitHub CI pending verification.
- Hosting Verification: NOT VERIFIED.
- Deploy Readiness: NOT READY.
- LOCK: NO.
- Next: Rio reviews this DRAFT PR, chooses isolated host and approves any activation explicitly.
