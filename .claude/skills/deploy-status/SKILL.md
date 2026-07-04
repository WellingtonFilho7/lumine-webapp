---
name: deploy-status
description: Verify a Vercel deployment after pushing - build status, build logs, runtime errors. Use after every push that should deploy, or when the user asks "did the deploy work / is it live / why is production broken". NEVER commit version badges, markers, or console.logs to verify a deploy - use this instead.
---

# Deploy Status (Vercel MCP)

This project deploys as **`lumine-webapp`** on Vercel team **`wellington-filhos-projects`** (`team_7bSZNhmPEsd1wAQYajxtdvnw`, project `prj_9wjoRDQ5JRqJZJCOhCVI4e1uwLcr`). The backend deploys separately as **`lumine-api`** (`prj_jfLz0a5QlOJGzBZLj772NFMjiNeg`).

## Steps

1. `mcp__Vercel__list_deployments` with the teamId + projectId — find the deployment for your commit SHA (compare `meta.githubCommitSha` to `git rev-parse HEAD`).
2. Check `state`: READY means live. ERROR → pull `mcp__Vercel__get_deployment_build_logs` and fix the build. BUILDING/QUEUED → wait and re-check; don't push "test" commits meanwhile.
3. After READY, check `mcp__Vercel__get_runtime_errors` for the project — a green build with runtime errors is the failure mode that used to cost multi-commit debug chains here.
4. Report to the user: state, deployment URL, and any errors found. On a PR, the Vercel bot comment also carries the preview URL — read it instead of deploying markers.
5. If env vars are suspected (blank values in the bundle), remember: every `REACT_APP_*` var must be in `REACT_APP_KEYS` in `vite.config.js` AND set in the Vercel project; a redeploy is required after changing env vars.
