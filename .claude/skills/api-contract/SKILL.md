---
name: api-contract
description: Gate before changing any code that calls the backend - sync, bootstrap, auth headers, finance endpoints, API response parsing. The contract lives in the sibling repo lumine-api; read the real handlers instead of guessing response shapes. Triggers - editing useSync, useFinance, useChildren, useRecords, apiHeaders, or anything under a /api/ URL.
---

# API Contract Gate

History shows response shapes guessed from the frontend cost ~8 mismatch-fix commits (receipt requirements, missing dates, amount mapping, category taxonomy). Rule: **do not change API-facing code without reading the backend.**

## Steps

1. If `lumine-api` is not in this session, add it: it is `WellingtonFilho7/lumine-api` on GitHub (add via `add_repo`, then clone as instructed). In a local CLI session, ask the user for the path instead — never assume `/Users/...` paths.
2. Read the actual route handlers for the endpoints you're touching (`/api/bootstrap`, `/api/sync`, finance routes). Note: required fields, optional fields with fallbacks, error response shapes, and which role (`admin`/`secretaria`) each route requires.
3. Auth: every request carries the Supabase session JWT in `X-User-Jwt`. There is no Bearer token. If you need a new header or claim, the change starts in `lumine-api`, not here.
4. If the change alters the contract (new field, new endpoint), update BOTH repos in the same working session and say so explicitly in both commit messages.
5. If you cannot access `lumine-api`, stop and tell the user which endpoint shapes you need — do not ship code based on assumed shapes.
