# Telegram gateway diagnostic checkpoint — 2026-10-19

Lane: P1-TELEGRAM-GATEWAY-DIAGNOSTICS | Owner: Codex for Rio
Scope / ownership: services/telegram-gateway/** only.
Parent SHA: 24d9bb87918984f7199267e8eaf1643ae5216879.
Branch: chatgpt/telegram-readonly-gateway-20261019; PR #2 remains DRAFT.
Status: DONE_SOURCE; BLOCKED_CI / BLOCKED_APPROVAL for deployment.
Commit identity: the commit containing this checkpoint (record final SHA in handoff).

## Verified source evidence
- Existing /start does not call GitHub or OpenAI. /status and /ask first require GitHub ref + pulls.
- Worker ACKs before background processing and catches failures: event outcome ok is not upstream success.
- Existing jsonFetch collapsed HTTP failures into REMOTE_ERROR; optional workboard swallowed errors.
- Full branch tree contains no AGENTS.md, root workboard or checkpoint. README owns existing lane status.
- Classification: PERLU PERBAIKAN (diagnostics); no new procurement feature or workspace integration.
- Modular + generated single-file use fixed operation/category codes, never raw exception messages,
  causes, request IDs, response bodies, URLs, headers, prompts, user/chat IDs or credential values.
- HTTP failure bodies are not read. Redirects fail closed. Unknown errors become INTERNAL_ERROR.
- Authorization, identity mode, OFF default, fixed GET GitHub endpoints, no AI tools, store:false preserved.
- Required GitHub failures stop AI; optional workboard failures are logged and status degrades safely.
- Timeout includes body parsing; 8s GitHub + 10s OpenAI + 5s send + at most 5s fallback fits
  nominal 28s within the existing 30s waitUntil window, excluding scheduling overhead.
  No new delivery guarantee, queue, retry loop or production-readiness claim.
- Single-file generator and exact parity test prevent manual distribution drift.

## Validation
Node 24.19.0: npm run check PASS; npm test 110/110 PASS (all external requests mocked).
Both distributions run success, access-control, HTTP/network/timeout/invalid-response matrices.
Extra tests cover hung fetch/body, untrusted error spoofing, body non-reading, delivery fallback,
optional workboard failure and exact generated-source parity.
Initial generator syntax error was corrected before this successful run.
CI parent run 39191974027 / job 117866564573: FAILURE; steps unavailable; log fetch returns
404 BlobNotFound. No root cause inferred. CI uses Node 22; local runtime is Node 24.
Latest commit CI must be checked separately after branch publication.

## Permission / endpoint review
GET /repos/{owner}/{repo}/git/ref/heads/main is the correct single-ref endpoint.
It needs Contents: Read. GET /repos/{owner}/{repo}/pulls?state=open&per_page=20
needs Pull requests: Read. Workboard contents needs Contents: Read on its explicit audit ref.
Fine-grained token: correct resource owner, only gmt-procurement selected, unexpired,
not revoked, and any organization approval satisfied. Do not broaden to write.
401 suggests invalid/expired credentials; 403 may be permissions/policy or rate limiting.
404 can mean hidden private resource/access or missing ref/path; it is not proof of absence.
429 (and 403 with rate-limit headers) is RATE_LIMIT; OpenAI 429 may mean quota/billing as well
as request rate. This intentionally cannot distinguish body-specific subcodes.
OpenAI 404 can indicate endpoint/model availability; 401/403 need project/key permission review.
No live secret bindings or credentials have been inspected or changed.

References:
- https://docs.github.com/en/rest/git/refs#get-a-reference
- https://docs.github.com/en/rest/pulls/pulls#list-pull-requests
- https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api

## Status gates
- Overall Source/Foundation Progress: procurement foundation unchanged; no percentage increase.
- Module Progress: scoped diagnostic fix implemented.
- Source/Test Status: local PASS; CI unresolved.
- Hosting Verification: NOT VERIFIED for this change; existing bot behavior is separate evidence.
- Deploy Readiness: NOT READY; requires CI resolution, exact release review and explicit Rio approval.
- LOCK Status: NO.

## Future verification — only after explicit Rio deployment approval
1. Confirm exact approved branch/SHA, target Worker and manual single-file artifact. Record current
   deployed version and rollback version; back up code/config metadata without exporting secrets.
2. Verify automatic deploy remains disabled, evaluate pending-update and cost/privacy risks,
   and approve smoke-test scope. No migration is involved.
3. Deploy only that approved artifact manually, preserving protected bindings. Do not paste tokens
   into chat, repository, screenshots, command URLs or diagnostic logs.
4. Test webhook rejection/unauthorized user isolation, /start, /status, then one short /ask.
   Record sanitized operation/category code and expected reply; outcome ok alone is insufficient.
5. If a diagnostic points to access, Rio reviews existing token scope/project permissions privately.
   Credential changes require separate authorization. 404 does not justify creating resources.
6. If regression occurs, restore the recorded prior Worker version/config under the approved
   rollback scope; verify behavior. Record hosting evidence before any HOSTING VERIFIED/LOCK claim.

No merge, deploy, Cloudflare change, secret activation, migration, SANRO or Drive access authorized.
Foundation Migration 04 must not be rerun. Next action: resolve CI evidence and obtain Rio approval
for any future deployment; source-only publication does not authorize deployment.

## Authorized live behavior check (existing deployment, not this revision)
2026-10-19, 13:11–13:13 Asia/Jakarta: via Rio's Telegram Web session, only GMT Procurement bot:
/start returned help normally; /status and one short /ask returned the same generic failure.
This reproduces the symptom but does not identify the failing API or prove deployed SHA.
No Cloudflare configuration, credentials, webhook or deployment was changed.


## Post-publication evidence
Implementation SHA: 951d6b23abd449cd3aa1e30917415922fb7806a3.
All 8 remote files read back at that SHA match the locally verified files exactly.
PR #2 remains open, draft, unmerged. Branch update used expected HEAD and force:false.
CI run https://github.com/arioguswara-oss/gmt-procurement/actions/runs/39209014230
reports FAILURE, but the authenticated GitHub UI annotation confirms the job did not start:
account payment failure or spending-limit restriction. This is BLOCKED_CI (account/billing),
not a test failure. No billing or spending settings changed. Rio must review that gate before
an authorized rerun; local tests remain 110/110 PASS. This follow-up changes evidence only.
