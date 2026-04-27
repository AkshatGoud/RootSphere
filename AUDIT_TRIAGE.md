# RootSphere — Audit Triage

This document buckets every finding from the audit performed on 2026-04-27 into one of:
- **Fix now** — addressed in Phase A of the roadmap before any new feature work
- **Fix later** — deferred until Phase B or until that area is touched
- **Won't fix** — accepted, with reason
- **Already fixed** — handled by the AppLayout refactor (commits `6a8e101` + `e197e86`)

73 findings total. ~36 fix-now, ~26 fix-later, ~6 won't-fix, ~5 already done.

> **How to use this doc:** scan the **Decisions** section first (9 items needing your input). Override any bucket assignment by editing this file. Once decisions are confirmed, I'll batch-fix the "Fix now" items in 5 focused commits.

## Summary

| Bucket | Count | Area split |
|---|--:|---|
| Fix now | 36 | Security 5 · ML 1 · API 4 · Frontend 16 · i18n 5 · Polish 5 |
| Fix later | 26 | Often blocked on Phase B feature decisions |
| Won't fix | 6 | Mostly cosmetic or working-as-intended |
| Already fixed | 5 | Handled in AppLayout commits |

---

## Decisions you need to confirm

These materially change the scope of Phase A. My recommendation listed first.

| # | Issue | Decision | My recommendation |
|---|---|---|---|
| #1, #11 | JWT secret fallback to `"supersecretkey"`; 30-day token, no refresh, no revocation | Fix #1 now? Defer #11 (refresh tokens) to Phase B as a feature? | **Yes — fix #1 now (security 🔴), defer #11.** Refresh tokens are a feature that deserves its own spec. |
| #2 | `/admin/create_field` is unauthenticated | Confirm safe to delete the endpoint? | **Yes, delete.** No frontend consumer; was a debug helper. |
| #7 | LSTM fed `temp_max = temp_c`, `temp_min = temp_c - 5` (fabricated) | Schema-change to store real min/max + retrain models? Or accept current degraded predictions? | **Fix later** — this is a 1-day chunk: model schema + Alembic migration + LSTM retraining job + UI showing real ranges. Do it as the first task in Phase B (ML correctness becomes a feature) rather than a Phase A patch. |
| #30 | 16 i18n keys present in EN, missing in HI/TA/TE (all delete-related: "Delete Field", "Failed to delete sensor", etc.) | Fill the translations now? | **Yes — fill them now.** Small task, immediate UX win for non-English users. |
| #39 | Dashboard "Avg Moisture / Avg Temp" KPIs actually show only the first field's data | Real averages (needs backend support — `/dashboard/kpis` endpoint) or rename labels honestly? | **Rename labels now** (e.g. "Featured Field Moisture") in Phase A. Build a real averages endpoint as a Phase B feature. |
| #41 | `/recommend/{id}` is POST-on-mount → page refresh re-runs ML inference + creates a new DB row | Change to GET with caching, or require explicit user click? | **Defer to Phase B.** This is a real design decision — caching strategy (cache key? TTL?) plus idempotency story. Not a quick fix. |
| #42 | Positive feedback recorded with `outcome: 'no_change'` | Fix to `'improved'` for the immediate-feedback case? Changes data shape going forward. | **Yes, fix now.** Already corrupting the feedback dataset. ~5 lines. |
| #43 | FieldsList does N+1 snapshot fetches | Build a `/snapshots/batch` endpoint and switch the frontend, or defer? | **Defer to Phase B.** Backend endpoint + frontend rewrite + invalidation strategy = own ticket. Acceptable at current scale. |
| #11 | (See JWT row above — broken out for clarity) | | |

---

## Fix now (36)

Grouped into 5 commit-batches. Each batch is one focused commit.

### Batch 1 — Security (5)

| # | Where | Fix |
|---|---|---|
| #1 | `backend/api/services/auth.py:13` | Drop the `"supersecretkey"` fallback. Raise on startup if `SECRET_KEY` env unset. |
| #2 | `backend/api/main.py:511-514` | Delete `/admin/create_field` endpoint outright. |
| #3 | `backend/api/main.py:38-43` | Drive CORS origins from env var; default to localhost only. Keep `allow_credentials=True` but never combine with `["*"]`. |
| #4 | `backend/api/main.py:91-95, 108-112, 154-158, 173-175` | Replace 404/401 split with a single 401 "Invalid email or password" for both login + forgot-password missing-account branches. |
| #18 | `backend/api/services/weather_ml.py:227, 258-260` | Pass `weights_only=True` to `torch.load()`. |

### Batch 2 — Backend correctness (5)

| # | Where | Fix |
|---|---|---|
| #5 | `backend/api/main.py:485-490, 498-503` | Replace `start: datetime = datetime.utcnow()...` defaults (evaluated at import) with `start: Optional[datetime] = None` and compute defaults inside the function body. |
| #12 | `backend/api/main.py:266-271` | Make `ingest_sensor` return a proper response schema with `id` + persisted `ts`, not the input schema. |
| #13 | `backend/api/main.py:30` | Remove `models.Base.metadata.create_all(bind=engine)`. Alembic owns the schema. |
| #19 | `backend/api/main.py:307-311` | Drop the local-disk write in `/upload/image`. Render's disk is ephemeral; base64-in-DB is the source of truth. |
| #20 | `backend/api/recommendation.py:155` | Defensive null-check on `snapshot.growth_stage` before `.lower()`. |

### Batch 3 — API contracts + frontend types (4)

| # | Where | Fix |
|---|---|---|
| #6 | `frontend/.../src/types/api.ts:223-226` | Replace `FeedbackResponse = { success, message }` with the real backend shape (`id, ts, field_id, recommendation_id, followed, outcome, notes`). |
| #21 | `frontend/.../src/types/api.ts:122-130` | Remove the `field_name?` field from `FieldSnapshot` and the long inline TODO comments. FieldDetail already injects the name from a separate `fieldsApi.get()` call. |
| #24 | `frontend/.../src/lib/api.ts:141` | `getByFarmer` ignores its parameter. Remove the param entirely; backend infers from JWT. |
| #31 | `backend/api/schemas.py:215-216` | Remove the duplicate `class Config:` declaration in `RecommendationHistoryItem`. |

### Batch 4 — Frontend correctness (16)

| # | Where | Fix |
|---|---|---|
| #8 | `frontend/.../src/lib/api.ts:62` | On 401, dispatch a logout via the auth context instead of `window.location.href = "/"`. Use react-router `Navigate` or post a custom event the AppLayout can listen for. |
| #9 | `frontend/.../src/components/ProtectedRoute.tsx` | Decode the JWT `exp` claim and treat expired tokens as logged-out. |
| #10 | `frontend/.../src/App.tsx:24` | `new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } } })`. |
| #25 | `frontend/.../src/pages/Login.tsx:74` | Fix useEffect deps for `handleGoogleSuccess`, OR move the function inside the effect. |
| #26 | `frontend/.../src/pages/Login.tsx:34, 36, 84, 86` | Replace direct `localStorage.setItem("access_token"...)` with a centralized `auth.setSession({ token, name, id })` helper in `lib/storage.ts`. Apply same fix to Profile.tsx where `localStorage.setItem("farmer_name"...)` lives. |
| #28 | `frontend/.../src/pages/Login.tsx:101-103` | Replace the hardcoded `lh3.googleusercontent.com` URL with a self-hosted image in `public/`. |
| #34 | `backend/api/recommendation.py:227-237` | Remove the unused `now = datetime.utcnow()` local. |
| #36 | `frontend/.../src/App.tsx:35` | Add a guard: if logged in and route is `/`, `<Navigate to="/dashboard" />`. |
| #37 | `backend/api/crud.py:36` | Move `from .services import auth` to top of file. |
| #40 | `frontend/.../src/pages/Dashboard.tsx:75-76` | Replace `catch {}` with `catch (err) { toast.error(...); }`. |
| #42 | `frontend/.../src/pages/RecommendationResult.tsx:67-72` | When `followed === true`, set `outcome: 'improved'` (not `'no_change'`). |
| #44 | `frontend/.../src/pages/FieldDetail.tsx:489-510` and `FieldsList.tsx:412` | Handle `indexOf === -1` case for unknown growth stages — show a "Stage: <raw value>" fallback. Same in stage-filter chip counts. |
| #57 | `frontend/.../src/pages/Dashboard.tsx:393-403` | "Get Recommendation" should navigate to a "pick a field" intermediate, OR be hidden when there are >1 fields. Sending users to first field is misleading. |
| #61 | `frontend/.../src/pages/RecommendationResult.tsx:357-399` | Hoist the `CATEGORY_CONFIG`, `SEVERITY_STYLES`, etc. Records to module scope (not redeclared per render). |
| #63 | `frontend/.../src/pages/RecommendationResult.tsx:325` | Remove permanent `animate-pulse` from risk alert banner — it's a vestibular hazard. Use a one-time fade-in instead. |
| #65 | `frontend/.../src/pages/FieldsList.tsx:208-211, 213` | Replace `<a onClick>` with `<Link>` and translate the hardcoded `"RootSphere"` string. |

### Batch 5 — i18n (5)

| # | Where | Fix |
|---|---|---|
| #29 | `frontend/.../src/pages/Feedback.tsx:60, 62` | Replace full-sentence translation keys (`t("Thank you for your feedback!")`) with short keys (`t("feedback.success")`). Apply same pattern wherever else found. |
| #30 | `frontend/.../src/i18n/locales/{hi,ta,te}/common.json` | Add the 16 missing keys (Delete Field/Sensor variants, etc.) to all 3 non-English locales. |
| #45 | `frontend/.../src/pages/Dashboard.tsx:31-36, 191` and `RecommendationResult.tsx:215` | Move `getGreeting()` strings into i18n locales. Stop wrapping English literals in `t()`. |
| #46 | `frontend/.../src/pages/Dashboard.tsx:98, 103-108` | Use the user's locale for date formatting (`Intl.DateTimeFormat(language, ...)`) instead of hardcoded `"en"` / `"en-US"`. |
| #49 | All pages | Stop calling `t()` on user-generated content (`t(field.name)`, `t(field.crop)`). For values that ARE translatable (growth_stage, crop name from a fixed list), keep `t()`. For free-form names, render directly. |

### Small wins / polish (5)

| # | Where | Fix |
|---|---|---|
| #32 | `backend/api/main.py:124, 159, 303, 348` | Move all in-function imports to top of file. |
| #35 | `frontend/.../src/pages/Login.tsx:233` and Dashboard footer | Replace hardcoded `2026` with `new Date().getFullYear()` (already done in SensorRegistry). |
| #64 | `frontend/.../src/pages/FieldsList.tsx:213` | Translate `"RootSphere"` → `t("RootSphere")` or use the dashboard link directly. |
| #68 | All pages with footers | Same year-fix as #35. |
| #72 | `frontend/.../src/pages/FieldDetail.tsx:106-117` | Drop dead `'mobile'`, `'satellite'`, `'webcam'` cases from `getSourceBadge` — backend only emits `'phone'` or `'drone'`. |

---

## Fix later (26)

Deferred because the fix is scope-creep, depends on a Phase B feature decision, or is cosmetic and will be redone in Phase C (design revamp).

| # | Where | Why deferred |
|---|---|---|
| #7 | `backend/api/main.py:441-443` (LSTM temp_min) | Treat as Phase B feature (ML correctness) — needs schema + retrain |
| #11 | `backend/api/services/auth.py:15` (30-day JWT) | Refresh-token system is a Phase B feature |
| #15 | `backend/api/recommendation.py:131-152` (data_completeness math) | Needs spec on what "completeness" means before fixing |
| #16 | `backend/api/recommendation.py:163-174` (re-runs image AI) | Needs caching infrastructure (key strategy, TTL); pair with #41 |
| #17 | `backend/api/recommendation.py:280` (risk_alert overwrite) | Subtle precedence logic; design first |
| #23 | `frontend/.../src/lib/api.ts:106, 161, 184` (data: any) | Best fixed via OpenAPI codegen — own ticket |
| #27 | `frontend/.../src/pages/Login.tsx:153-194` (plain inputs vs shadcn) | Will be redone in Phase C design revamp |
| #33 | `backend/api/models.py:16-17` (nullable email/password_hash) | Tightening to NOT NULL is a migration with backfill — own ticket |
| #38 | `backend/api/main.py:266, 273, 280` (404 boilerplate) | Marginal value; refactor when adding more endpoints |
| #41 | RecommendationResult POST-on-mount | See Decisions table |
| #43 | FieldsList N+1 | See Decisions table |
| #47 | All pages, useEffect deps | One sweep after Phase B fixes the surface area |
| #48 | All pages, no memoization | Pre-optimization; only matters at >500 fields/sensors |
| #52 | `FieldDetail.tsx:122-130` (7 useStates) | Refactor to useReducer when touched |
| #54 | `FieldDetail.tsx:535-563` (stage tips IIFE) | Perf-only |
| #55 | `FieldDetail.tsx:621-624` (bg-image instead of `<img>`) | Will be touched in Phase C |
| #56 | `Dashboard.tsx:268-303` (chart hardcoded hex) | Phase C — design tokens |
| #58 | Dashboard KPI loading skeleton | Phase C — design |
| #60 | RecommendationResult `window.print()` | "Real PDF export" is a Phase B feature |
| #62 | RecommendationResult rotated divider | Phase C — design |
| #66 | FieldsList O(n²) chip counts | Pre-optimization |
| #67 | FieldsList empty mb-4 div hack | Phase C |
| #69 | Dashboard footer dead links | Need actual privacy/tos pages first |
| #14 | `main.py:431-465` get_recommendation re-runs auth | Working; refactor only if it bites |
| #39 (rename half) | Dashboard label rename now (Fix now); real averages backend = Phase B feature | |
| #41 (caching half) | See Decisions | |

---

## Won't fix (6)

| # | Where | Reason |
|---|---|---|
| #14 | `main.py` get_recommendation re-runs `get_field_snapshot()` | Works; refactor would obscure the data flow |
| #22 | `types/api.ts:139` Sensor.status union | Frontend's narrower type is fine; we control the values backend writes |
| #38 | 404 boilerplate duplication | Repetition is acceptable here; abstraction would hide intent |
| #50 | farmerName from localStorage on every render | localStorage reads are fast; profile updates already trigger a refresh path |
| #70 | RecommendationResult dark feedback footer | Intentional contrast for "action prompt" pattern; revisit only in Phase C if it conflicts with the new design |
| #73 | material-symbols icons no fallback | Acceptable risk; bundling an icon font as fallback adds weight, switching to SVGs is a Phase C scope decision |

---

## Already fixed (5)

In the AppLayout refactor commits `6a8e101` (foundation) and `e197e86` (remaining 7 pages).

| # | Where | What was fixed |
|---|---|---|
| #51 | LANG_OPTIONS / GROWTH_STAGE_COLORS / CROP_ICONS duplicated across pages | Moved to `src/constants/languages.ts` and `src/constants/crops.ts` |
| #53 | FieldDetail logo as `<div onClick>` | Now a keyboard-focusable `<Link>` in AppLayout |
| #59 | RecommendationResult loading state without nav header | Now wrapped in `<AppLayout>` |
| #71 | GROWTH_STAGE_COLORS / CROP_ICONS duplicated FieldDetail/FieldsList | Moved to `src/constants/crops.ts` |
| (chrome dup) | ~700 lines of identical header/nav/bottom-nav per page | Eliminated in AppLayout (1156 lines removed across 11 pages) |

---

## Execution order if you confirm my recommendations

Single sequence, one commit per batch unless flagged:

1. **Batch 1 — Security** (5 items, ~30 min)
2. **Batch 2 — Backend correctness** (5 items, ~30 min)
3. **Batch 3 — API contracts + types** (4 items, ~20 min)
4. **Batch 4 — Frontend correctness** (16 items, ~90 min — *split into 2 commits if too large*)
5. **Batch 5 — i18n** (5 items, ~45 min — most of the time is translating the 16 missing keys)
6. **Small wins / polish** (5 items, ~15 min)

Total: ~3.5–4 hours of focused work, distributed across 6–7 commits.

After each batch: `npx tsc --noEmit` + smoke-test in Docker. Backend changes also need a manual API test (login flow, field create, recommend, sensor simulate).

---

## How to override

Edit this file directly:
- Move an item between sections by cutting/pasting
- Add a `~~strikethrough~~` to drop an item
- Add notes inline with `> NOTE:`

Once you've finalized, tell me "go" and I'll execute the batches in order.
