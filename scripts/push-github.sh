#!/bin/bash
# Push PhoneConn to GitHub using a Personal Access Token
# Usage: bash scripts/push-github.sh <TOKEN> [USERNAME]
set -e

TOKEN="$1"
USERNAME="${2:-edumahmoud}"
REPO="PhoneConn"

if [ -z "$TOKEN" ]; then
  echo "ERROR: token required. Usage: bash scripts/push-github.sh <TOKEN> [USERNAME]"
  exit 1
fi

cd /home/z/my-project

# Set remote URL with embedded credentials (token used only for this push)
git remote set-url origin "https://${USERNAME}:${TOKEN}@github.com/${USERNAME}/${REPO}.git"

echo "==> Pushing main branch to github.com/${USERNAME}/${REPO}.git ..."
if git push -u origin main; then
  echo "==> SUCCESS: Repository pushed."
  echo "==> URL: https://github.com/${USERNAME}/${REPO}"
else
  echo "==> PUSH FAILED"
  git remote set-url origin "https://github.com/${USERNAME}/${REPO}.git"
  exit 1
fi

# Security: scrub the token from the remote URL afterwards
git remote set-url origin "https://github.com/${USERNAME}/${REPO}.git"
echo "==> Token scrubbed from git config. You may revoke the token on GitHub now."
