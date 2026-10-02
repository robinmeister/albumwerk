#!/bin/sh
# Pusht main ohne .claude/.gitea/.githooks zu GitHub. Gitea (origin) bleibt vollständig.
# filter-branch ist deterministisch: gleiche History -> gleiche Hashes -> Fast-Forward.
set -e
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git clone -q --no-local --single-branch -b main . "$tmp"
cd "$tmp"
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch \
  --index-filter 'git rm -rq --cached --ignore-unmatch .claude .gitea .githooks' \
  --prune-empty main >/dev/null
git push "$@" https://github.com/robinmeister/albumwerk.git main
