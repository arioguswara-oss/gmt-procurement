#!/usr/bin/env bash
# GMT Procurement: manual on-demand, no daemon, no Git fetch and no deployment.
set -Eeuo pipefail
umask 077

if [[ "$(id -un)" != "gmtci" ]]; then
  echo 'STOP: run only as the dedicated gmtci user (not sanro/root).' >&2
  exit 3
fi

REPO=/home/gmtci/gmt-procurement
EXPECTED_REMOTE='git@github.com:arioguswara-oss/gmt-procurement.git'
if [[ ! -d "$REPO/.git" ]]; then
  echo 'STOP: expected checkout missing. Never clone automatically.' >&2
  exit 4
fi
REMOTE="$(git -C "$REPO" remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE" != "$EXPECTED_REMOTE" ]]; then
  echo 'STOP: unexpected Git origin. Use a read-only deploy-key SSH remote.' >&2
  exit 5
fi
if [[ -n "$(git -C "$REPO" status --porcelain --untracked-files=all)" ]]; then
  echo 'STOP: checkout has local modifications; review first.' >&2
  exit 6
fi

SHA="$(git -C "$REPO" rev-parse --verify HEAD)"
BRANCH="$(git -C "$REPO" branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo 'STOP: detached HEAD requires separate review.' >&2
  exit 7
fi

printf 'GMT-CI START branch=%s sha=%s\n' "$BRANCH" "$SHA"

# First phase: offline Python tests and repo guard only.
# No host /home, /etc, /var or Docker socket within sandbox.
# No npm install, external network, email, WhatsApp, DB, or deployment.
set +e
timeout --signal=TERM --kill-after=5s 180s \
  bwrap --unshare-user --unshare-pid --unshare-net --unshare-ipc --unshare-uts \
    --die-with-parent --new-session --clearenv \
    --setenv PATH /usr/bin:/bin --setenv HOME /tmp \
    --setenv LANG C.UTF-8 --setenv PYTHONDONTWRITEBYTECODE 1 \
    --setenv PYTHONNOUSERSITE 1 \
    --ro-bind /usr /usr \
    --symlink usr/bin /bin --symlink usr/lib /lib \
    --symlink usr/lib64 /lib64 --symlink usr/sbin /sbin \
    --proc /proc --dev /dev --tmpfs /tmp \
    --ro-bind "$REPO" /work --chdir /work \
    -- /usr/bin/bash -euc '
      ulimit -t 120
      echo "CI: Python source guard unit tests"
      python3 -m unittest discover -s scripts -p "test*.py" -v
      echo "CI: tracked-file source safety guard"
      python3 scripts/source_guard.py
    '
code=$?
set -e

if [[ $code -eq 0 ]]; then
  echo "GMT-CI PASS sha=$SHA"
else
  echo "GMT-CI FAIL exit=$code sha=$SHA" >&2
fi
exit "$code"
