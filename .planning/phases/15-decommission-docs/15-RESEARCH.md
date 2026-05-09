# Phase 15: Decommission & Docs — Research

**Researched:** 2026-05-09
**Domain:** Codebase cleanup, deployment, documentation update
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DECOM-01 | `src/lib/github/octokit.ts` deleted | File confirmed present; no external non-github-lib imports found |
| DECOM-02 | `src/lib/github/queries.ts` deleted | File confirmed present; its spec file goes with it |
| DECOM-03 | `src/lib/github/mutations.ts` deleted | File confirmed present; no spec file (none exists) |
| DECOM-04 | `src/lib/github/etag.ts` deleted | File confirmed present; spec file goes with it |
| DECOM-05 | `src/lib/github/auth.ts` deleted | File confirmed present; spec file goes with it |
| DECOM-06 | `prompt-community-data` repository archived | External GitHub action; operator task with documented steps |
| DECOM-07 | `wrangler.toml` cleaned of two-repo configuration | Root `wrangler.toml` references old oauth worker; entire file is v1 artifact |
| DECOM-08 | `.env.example` drops `VITE_GITHUB_OWNER` and `VITE_GITHUB_DATA_REPO` | File confirmed to contain v1 vars including `VITE_GITHUB_REPO` (equivalent) |
| DECOM-09 | `design/planning-artifacts/product-brief-prompt-community-2026-03-14.md` updated | File describes v1 GitHub-Issues architecture; needs v2 summary |
| DECOM-10 | `design/planning-artifacts/prd.md` updated | NFRs and FRs reference GitHub API, ETag, GitHub-as-DB; need v2 wording |
| DECOM-11 | `design/planning-artifacts/architecture.md` rewritten | Describes GitHub-Issues data model, ETag layer, GraphQL reads; all stale |
| DECOM-12 | `design/planning-artifacts/epics.md` updated to add Epic 0 | Needs Backend Foundation epic prepended to existing epic list |
| DECOM-13 | `design/research/vue-github-issues-platform-research.md` marked historical | Add superseded banner at top of document |
| DEPLOY-01 | API worker deployable via `wrangler deploy` | `deploy:worker` script exists but points to wrong wrangler.toml; needs fix |
| DEPLOY-02 | Production D1 provisioned and migrated | Requires `wrangler d1 create`, update `database_id` in API wrangler.toml, run migrations |
| DEPLOY-03 | Production secrets configured via `wrangler secret` | Three secrets: `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| DEPLOY-04 | Production OAuth App callback URL configured | GitHub OAuth App callback must point to deployed worker host `/auth/callback` |
</phase_requirements>

---

## Summary

Phase 15 is a cleanup and deployment phase — no new features, no new APIs. It has three distinct workstreams that can be planned independently: (1) delete v1 code paths, (2) deploy the v2 API worker to production, and (3) update documentation artifacts.

The v1 decommission is mechanical: eight files in `src/lib/github/` (five `.ts` plus three `.spec.ts`) are deleted, along with the root `wrangler.toml` (which references the old OAuth proxy worker). One active component — `ImageUploadZone.vue` — still uses `VITE_CF_WORKER_URL` for image uploads to R2; this is a v1 path that has not yet been migrated to the v2 API. The planner must decide whether to leave it in place (out-of-scope migration) or stub/remove it.

Deployment is entirely a Cloudflare `wrangler` operation. The `deploy:worker` npm script currently points to the root `wrangler.toml` (old oauth worker), not to `src/workers/api/wrangler.toml`. This must be fixed before deployment. The production D1 database must be provisioned (`wrangler d1 create`), its UUID written into the API wrangler.toml, and three secrets set. No application code changes are required for production deployment — only configuration.

Documentation updates are editorial rewrites. The five design artifacts describe the v1 GitHub-Issues architecture in detail; they need to be rewritten to describe the v2 Cloudflare Workers + D1 + Hono architecture. The research doc needs only a banner. `CONTRIBUTING.md` is already largely correct for v2 (written during Phase 9) — it may need minor cleanup of any remaining v1 references.

**Primary recommendation:** Plan three sequential waves — Wave 1: delete v1 code + fix deploy config, Wave 2: production deployment, Wave 3: doc rewrites. This ordering ensures the app is provably working in production before docs are finalized.

---

## Standard Stack

No new libraries are introduced in Phase 15. All operations use tools already installed and configured.

### Core Tools for This Phase

| Tool | Version | Purpose |
|------|---------|---------|
| `wrangler` | ^4.73.0 | Deploy API worker, provision D1, set secrets |
| `vue-tsc` | ^3.2.5 | Verify clean compile after file deletions |
| `vitest` | ^4.1.0 | Verify tests pass after file deletions |

### Deployment Commands Reference

```bash
# Provision production D1 (one-time, requires wrangler auth)
npx wrangler d1 create prompt-community-db

# Apply migrations to production D1
npx wrangler d1 migrations apply prompt-community-db --config src/workers/api/wrangler.toml --remote

# Set production secrets
npx wrangler secret put JWT_SECRET --config src/workers/api/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_ID --config src/workers/api/wrangler.toml
npx wrangler secret put GITHUB_CLIENT_SECRET --config src/workers/api/wrangler.toml

# Deploy API worker
npx wrangler deploy --config src/workers/api/wrangler.toml
```

---

## Architecture Patterns

### What Exists and What Gets Deleted

```
src/lib/github/           <- DELETE ENTIRE DIRECTORY (5 TS + 3 spec files)
  auth.ts                 (DECOM-05) + auth.spec.ts
  etag.ts                 (DECOM-04) + etag.spec.ts
  mutations.ts            (DECOM-03) [no spec]
  octokit.ts              (DECOM-01) + octokit.spec.ts
  queries.ts              (DECOM-02) [no spec]

wrangler.toml             <- DELETE or repurpose (DECOM-07) — currently points to old oauth worker
src/workers/oauth.ts      <- v1 OAuth proxy worker (assess whether to keep or delete)
src/workers/oauth.spec.ts <- v1 spec (goes with oauth.ts)
src/workers/upload.ts     <- v1 R2 upload proxy (ImageUploadZone.vue still references it)
src/workers/upload.spec.ts

.env.example              <- UPDATE (DECOM-08): remove v1 vars, add v2 vars
```

### External Files Confirmed Safe After Deletion

`grep` analysis shows no source files outside `src/lib/github/` import directly from `src/lib/github/`. The only references found:

1. `src/router/index.ts` line 7 — a **comment only**, no live import (left from Phase 10; delete the comment)
2. `src/composables/queries/usePromptsQuery.spec.ts` line 46 — a **test assertion string** (not an import; keep as-is, it documents the correct behavior)
3. `src/stores/useAuthStore.spec.ts` line 35 — a **test description string** (not an import; keep as-is)

After deleting `src/lib/github/`, `vue-tsc --noEmit` and `vitest run` should pass without additional changes (except removing the stale comment in router/index.ts).

### The `deploy:worker` Script Problem

Current `package.json`:
```json
"deploy:worker": "wrangler deploy"
```

Without `--config`, this uses the root `wrangler.toml`, which deploys the old OAuth proxy worker (`src/workers/oauth.ts`), not the v2 API. The fix:
```json
"deploy:worker": "wrangler deploy --config src/workers/api/wrangler.toml"
```

This is a one-line package.json change that must happen before DEPLOY-01 can be satisfied.

### Production `wrangler.toml` Changes Required

The API wrangler.toml currently has:
```toml
database_id = "local"
```

After running `wrangler d1 create`, the real UUID from Cloudflare must replace `"local"`. Production `APP_ORIGIN` must also be set to the deployed Cloudflare Pages URL.

Consider: the planner may choose to separate dev-only vars from production vars using wrangler environments (`[env.production]`) rather than committing the real database_id. Both approaches work; using a `[env.production]` block is cleaner.

### `.env.example` Cleanup (DECOM-08)

Current `.env.example` contains v1 vars that must be removed:
- `VITE_GITHUB_OWNER` — remove
- `VITE_GITHUB_REPO` — remove (was `prompt-community-data`)
- `VITE_GITHUB_CLIENT_ID` — remove (GitHub OAuth is now server-side only)
- `VITE_CF_WORKER_URL` — **keep or update** if `ImageUploadZone.vue` still uses it
- `VITE_R2_PUBLIC_URL` — keep if image upload via R2 is retained
- `VITE_GITHUB_APP_INSTALLATION_ID` — remove
- `VITE_API_URL` — keep (v2 var, already present)

The `@octokit/core` and `@octokit/graphql` packages remain in `dependencies` in `package.json`. After DECOM-01 through DECOM-05, they will be dead weight. Remove them with `npm uninstall @octokit/core @octokit/graphql` unless the planner confirms they are needed elsewhere.

### Image Upload Scope Decision (Not in Requirements)

`ImageUploadZone.vue` uses `VITE_CF_WORKER_URL` to hit `${workerUrl}/api/upload`. This calls `src/workers/upload.ts`, which is the v1 R2 upload proxy. The upload worker is **not** in the v2 API.

The DECOM requirements do not mention upload.ts. Two options:
1. **Leave it alone** — `upload.ts` stays, `VITE_CF_WORKER_URL` stays in `.env.example`; image upload still works separately from the v2 API. This is the safest path and avoids scope creep.
2. **Remove it** — ImageUploadZone.vue loses image upload capability; would need a Phase 16.

Research finding: the REQUIREMENTS.md has no DECOM requirement for upload.ts. Leave upload.ts and `VITE_CF_WORKER_URL` in place (option 1). The `.env.example` retains `VITE_CF_WORKER_URL`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Verifying no dead imports | Custom import scanner | `vue-tsc --noEmit` — compiler catches all dead/missing imports |
| Production secrets management | Config files with secrets | `wrangler secret put` — Cloudflare encrypted secrets API |
| D1 production migrations | Manual SQL execution | `wrangler d1 migrations apply --remote` — applies Drizzle migration files to production |
| Checking test coverage after deletion | Manual file inspection | `vitest run` — surfacing test failures is the verification mechanism |

---

## Common Pitfalls

### Pitfall 1: Deleting spec files when deleting source files
**What goes wrong:** `src/lib/github/auth.spec.ts`, `etag.spec.ts`, and `octokit.spec.ts` test the deleted modules. If only the `.ts` source is deleted but not the spec, `vitest run` fails because it cannot resolve the import of the now-deleted module.
**How to avoid:** Delete spec files alongside their source files. The three spec files are: `auth.spec.ts`, `etag.spec.ts`, `octokit.spec.ts`. No spec exists for `mutations.ts` or `queries.ts`.
**Verification:** `vitest run` passes cleanly after deletions.

### Pitfall 2: `deploy:worker` deploying the wrong worker
**What goes wrong:** Running `npm run deploy:worker` without fixing the script deploys `src/workers/oauth.ts` (the v1 OAuth proxy) instead of the v2 Hono API, because the root `wrangler.toml` is used by default.
**How to avoid:** Fix `deploy:worker` in `package.json` to add `--config src/workers/api/wrangler.toml` before running any deployment.
**Verification:** After deploy, the worker URL responds to `GET /me` with 401 (correct API behavior), not the v1 OAuth redirect pattern.

### Pitfall 3: Committing production `database_id` and `APP_ORIGIN` into source
**What goes wrong:** Real Cloudflare account-specific values (D1 database UUID, production Pages URL) committed to `wrangler.toml` create confusion between dev and prod configs, and potentially expose account identifiers.
**How to avoid:** Use a `[env.production]` block in `wrangler.toml` for production overrides, or document the production values in a separate gitignored file. The dev `database_id = "local"` placeholder is fine to commit.

### Pitfall 4: `@octokit` packages left in `package.json` after source deletion
**What goes wrong:** `@octokit/core` and `@octokit/graphql` remain as dead dependencies after the github lib files are deleted, bloating the bundle.
**How to avoid:** Run `npm uninstall @octokit/core @octokit/graphql` as part of the decommission plan. Verify `vue-tsc` and `vitest` still pass.
**Warning sign:** `package.json` still lists `@octokit/core` and `@octokit/graphql` after DECOM-01 through DECOM-05.

### Pitfall 5: Stale comment in `src/router/index.ts` remaining
**What goes wrong:** Line 7 of `router/index.ts` references `@/lib/github/auth` in a comment. After the directory is deleted, a future developer reading this comment will be confused.
**How to avoid:** Delete the Phase 10 stale comment (lines 5–7 in router/index.ts) as part of the DECOM wave. Not a compile error, just a maintenance concern.

### Pitfall 6: Production D1 migrations not applied before worker deploy
**What goes wrong:** Deploying the worker to production before running `wrangler d1 migrations apply --remote` means all API calls will fail with SQLite table-not-found errors.
**How to avoid:** Sequence matters: provision D1 → apply migrations → set secrets → deploy worker. Do not deploy before D1 schema exists.

### Pitfall 7: `wrangler.toml` root file vs. API worker config confusion
**What goes wrong:** Two `wrangler.toml` files exist: root (for old OAuth worker, `name = "prompt-community-auth"`) and `src/workers/api/wrangler.toml` (for v2 API, `name = "prompt-community-api"`). After Phase 15, the root one should be deleted or clearly marked deprecated.
**How to avoid:** Delete the root `wrangler.toml` as part of DECOM-07. The remaining config is `src/workers/api/wrangler.toml`.

---

## Code Examples

### Deletion Checklist (all files to remove)

```
src/lib/github/octokit.ts        (DECOM-01)
src/lib/github/octokit.spec.ts   (companion spec)
src/lib/github/queries.ts        (DECOM-02)
src/lib/github/mutations.ts      (DECOM-03)
src/lib/github/etag.ts           (DECOM-04)
src/lib/github/etag.spec.ts      (companion spec)
src/lib/github/auth.ts           (DECOM-05)
src/lib/github/auth.spec.ts      (companion spec)
wrangler.toml                    (DECOM-07, root-level, v1 OAuth worker config)
src/workers/oauth.ts             (v1 OAuth proxy — no longer needed)
src/workers/oauth.spec.ts        (companion spec)
```

After deletion, verify:
```bash
npm run build      # vue-tsc + vite build: must succeed
npm test           # vitest run (jsdom): must pass
npm run test:workers  # vitest workers: must pass
```

### `.env.example` After Decommission

```bash
# .env.example — copy to .env.local and fill in values

# v2 API base URL (Hono worker on localhost in dev; deployed CF worker in prod)
VITE_API_URL=http://localhost:8787

# Cloudflare Worker for image uploads (R2 proxy — separate from v2 API)
VITE_CF_WORKER_URL=https://upload.your-domain.workers.dev

# Cloudflare R2 public URL for image storage
VITE_R2_PUBLIC_URL=https://assets.your-domain.com
```

### `package.json` script fix for DEPLOY-01

```json
"deploy:worker": "wrangler deploy --config src/workers/api/wrangler.toml"
```

### API `wrangler.toml` with production environment block

```toml
name = "prompt-community-api"
main = "index.ts"
compatibility_date = "2025-01-01"

[vars]
ENV = "dev"
APP_ORIGIN = "http://localhost:5173"
GITHUB_CLIENT_ID = "test-client-id"
JWT_SECRET = "test-jwt-secret-for-local-dev-only"

[[d1_databases]]
binding = "DB"
database_name = "prompt-community-db"
database_id = "local"
migrations_dir = "db/migrations"

[env.production]
[env.production.vars]
ENV = "production"
APP_ORIGIN = "https://YOUR_PAGES_DOMAIN.pages.dev"
# GITHUB_CLIENT_ID, JWT_SECRET, GITHUB_CLIENT_SECRET set via wrangler secret put

[[env.production.d1_databases]]
binding = "DB"
database_name = "prompt-community-db"
database_id = "REAL_UUID_FROM_WRANGLER_D1_CREATE"
migrations_dir = "db/migrations"
```

### Superseded Banner for DECOM-13

```markdown
> **HISTORICAL DOCUMENT — SUPERSEDED**
> This research describes the v1 GitHub-Issues-as-database architecture,
> which was replaced by the v2 Cloudflare Workers + D1 + Hono backend
> (completed 2026-05-09). See `design/change-request-v2.md` for the v2 PRD
> and `design/planning-artifacts/architecture.md` for the current architecture.
```

### Router index.ts comment cleanup

Remove lines 5–7 from `src/router/index.ts`:
```typescript
// NOTE: verifyMaintainerStatus re-export removed in Phase 10 (cookie-based auth).
// The router now uses authStore.isMaintainer (derived from user.role in JWT cookie).
// Any callers that imported verifyMaintainerStatus from here should import directly
// from @/lib/github/auth, or update to Phase 13 approach (to be cleaned up in Phase 15).
```

---

## State of the Art

| Area | v1 State | v2 State After Phase 15 |
|------|----------|------------------------|
| Data storage | GitHub Issues as DB via Octokit GraphQL | Cloudflare D1 + Drizzle ORM |
| Auth | GitHub OAuth token in Pinia (memory) | JWT HttpOnly cookie from Hono worker |
| Rate limiting | ETag conditional requests to GitHub API | Not needed — own backend, no rate limit |
| Deployment | Static Pages + small OAuth proxy worker | Static Pages + full Hono API worker |
| Two-repo model | SPA repo + `prompt-community-data` repo | Single repo (data repo archived) |

---

## Open Questions

1. **`src/workers/upload.ts` and `ImageUploadZone.vue`**
   - What we know: `ImageUploadZone.vue` still calls `${VITE_CF_WORKER_URL}/api/upload`; `upload.ts` is the v1 R2 proxy; neither has a DECOM requirement
   - What's unclear: Is image upload via R2 still the intended long-term approach for v2? Is `upload.ts` being kept or migrated to the v2 Hono API?
   - Recommendation: Leave `upload.ts` and `VITE_CF_WORKER_URL` in place for Phase 15 — image upload is a separate concern not covered by any DECOM requirement. Document this as a future Phase 16 item.

2. **Should `src/workers/oauth.ts` be deleted?**
   - What we know: It is the v1 OAuth proxy, replaced by the Hono `/auth/login` and `/auth/callback` endpoints. `wrangler.toml` (root) references it.
   - What's unclear: Whether any production traffic still hits the deployed v1 worker
   - Recommendation: Delete `oauth.ts` and `oauth.spec.ts` along with the root `wrangler.toml`. This is implied by DECOM-07 ("clean of two-repo configuration") and the v2 architecture.

3. **Production `database_id` management**
   - What we know: `database_id = "local"` is the dev placeholder; the real UUID comes from `wrangler d1 create`
   - What's unclear: Whether to commit the real UUID to source or keep it out-of-source
   - Recommendation: Commit the UUID to `wrangler.toml` under a `[env.production]` block — D1 database IDs are not secrets (only the D1 data requires auth to access).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (jsdom) + `vitest.workers.config.ts` (workerd) |
| Quick run command | `npm test` |
| Full suite command | `npm test && npm run test:workers` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECOM-01..05 | No import of deleted module survives | Build gate | `npm run build` (vue-tsc catches dead imports) | N/A — compiler check |
| DECOM-01..05 | No test suite fails after file deletion | Test suite | `npm test && npm run test:workers` | ✅ existing suites |
| DEPLOY-01 | Worker responds after deploy | Smoke test | `curl https://YOUR_WORKER.workers.dev/me` returns 401 JSON | manual |
| DEPLOY-02 | D1 schema exists in production | Smoke test | `wrangler d1 execute prompt-community-db --command "SELECT name FROM sqlite_master" --remote` | manual |
| DEPLOY-03 | Secrets set (no plaintext in config) | Verification | `wrangler secret list --config src/workers/api/wrangler.toml` | manual |
| DECOM-08 | `.env.example` has no v1 vars | Manual review | `grep "VITE_GITHUB_OWNER\|VITE_GITHUB_DATA_REPO" .env.example` returns empty | manual |
| DECOM-13 | Research doc has superseded banner | Manual review | File inspection | manual |

### Sampling Rate
- **Per task commit:** `npm test` (jsdom suite only, fast)
- **Per wave merge:** `npm test && npm run test:workers`
- **Phase gate:** `npm run build && npm test && npm run test:workers` all green before phase close

### Wave 0 Gaps
None — existing test infrastructure covers all automated checks. All DECOM requirements use the existing test suite as the verification mechanism (deleting files must not break existing tests). DEPLOY requirements are operator/manual tasks.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/lib/github/` directory, all 8 files enumerated
- `grep` analysis of all imports from `@/lib/github` across `src/**/*.ts` and `src/**/*.vue`
- `wrangler.toml` (root) and `src/workers/api/wrangler.toml` — read directly
- `.env.example` — read directly; v1 vars confirmed present
- `package.json` — scripts and dependencies read directly; `deploy:worker` issue confirmed
- `CONTRIBUTING.md` — read directly; v2 workflow already documented
- `design/planning-artifacts/` — all five files confirmed to contain v1-era content

### Secondary (MEDIUM confidence)
- Wrangler CLI deployment workflow — consistent with `wrangler` v4.73.0 in devDependencies and Cloudflare documentation patterns
- `wrangler d1 migrations apply --remote` — documented command for production D1 migration

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Decommission scope (DECOM-01..08): HIGH — all files located, all imports checked via grep, deletion list is exhaustive
- Documentation updates (DECOM-09..13): HIGH — all five files confirmed to contain v1-era content; scope of rewrite is clear
- Deployment (DEPLOY-01..04): HIGH — wrangler commands are standard, deploy:worker bug confirmed, sequence is well-understood
- Image upload scope decision: MEDIUM — `upload.ts` is not in requirements; recommendation is conservative (leave in place)

**Research date:** 2026-05-09
**Valid until:** Phase 15 complete (no external dependencies; all findings are codebase-internal)
