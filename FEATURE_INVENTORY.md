# RootSphere — Feature Inventory & Roadmap

This document maps every feature RootSphere currently has, plus common gaps, plus Indian-context features that may matter. For each item, mark **keep / drop / build / defer**.

> **How to use:** scan the **Decisions** at the top, then go through each table. Edit the bucket column directly. Once you've confirmed, I'll spec the "build" items in priority order and we ship them in batches.

## Top-level decisions

These are scope-defining choices. Everything else flows from them.

| # | Question | My recommendation |
|---|---|---|
| **D1** | **Who is the primary user?** Smallholder Indian farmer (1–5 acres) / Commercial Indian farmer (10–100 acres) / Agronomist advisor / All three? | **Smallholder farmer first.** Simpler scope, biggest impact, your i18n (HI/TA/TE) already signals this. Commercial + advisor become extension features later. |
| **D2** | **Is this a single-tenant tool (1 farmer = 1 account) or multi-user (teams, family, advisors with multiple farmers)?** | **Single-tenant for v1.** Multi-tenant changes the data model (RBAC, sharing, invitations). Defer to v2. |
| **D3** | **Distribution channel?** Web app only / Mobile-installable PWA / Native mobile app / SMS/voice fallback? | **Web app + PWA.** Native is too expensive for v1. SMS/voice is a Phase D feature for offline reach. PWA is essentially free given Vite. |
| **D4** | **Monetization model?** Free / Freemium (1 field free, more = pay) / Subscription / Pay-per-recommendation / B2B (sell to dealers/cooperatives) | Affects which features matter. **Default if unsure: Free during validation, then B2B (license to FPOs / cooperatives / agri-extension orgs).** Avoids per-farmer billing complexity. |
| **D5** | **What does success look like in 6 months?** Number of fields under management? Number of recommendations followed? Yield improvement vs control? Pilot with X cooperative? | Decides what we measure → decides what we build. **Default: 100 fields × 30 days of usage, with a >40% recommendation-followed rate.** |

The rest of the doc assumes the defaults. Override above and I'll re-prioritize.

---

## A. What RootSphere does today (mapped from the codebase)

For each: **keep** (works as is), **fix** (works but flagged in audit), **drop** (not pulling weight).

### Auth

| Feature | Status | My pick |
|---|---|---|
| Email + password registration | ✅ working | **keep** |
| Email + password login | ✅ working (security tightened in Batch 1) | **keep** |
| Google SSO (one-tap) | ✅ working | **keep** — modern + reduces friction |
| Forgot password (email 6-digit code, 15-min expiry, Resend) | ✅ working (no enumeration after Batch 1) | **keep** |
| 30-day JWT, no refresh token | ⚠️ deferred from audit (#11) | **build** refresh tokens — see Section C |
| Multi-user / team support | ❌ not built | **drop for v1** per D2 |

### Field management

| Feature | Status | My pick |
|---|---|---|
| Create field (name, crop, growth stage, lat/lon via map picker) | ✅ working | **keep** |
| List fields (search, stage filter, sort, grid/list view) | ✅ working (after AppLayout migration) | **keep** |
| Field detail (snapshot + sensor + weather + images + actions) | ✅ working | **keep** — flagship screen |
| Edit field (name, crop, stage, location) | ✅ working | **keep** |
| Delete field (cascades all data) | ✅ working | **keep** |
| Per-field LSTM auto-trained on creation | ✅ working | **keep** but see Section C #C1 (real temp_max/min) |

### Sensor management

| Feature | Status | My pick |
|---|---|---|
| Register sensor (name, type, metrics, notes) | ✅ working | **keep** |
| Assign / reassign to a field (auto-deactivates previous) | ✅ working | **keep** |
| Lifecycle states (draft / active / inactive) + auto-heal | ✅ working | **keep** |
| Simulate sensor reading (real ICAR data + scenarios + noise + temporal blend) | ✅ working — sophisticated | **keep** as a debugging/demo tool, but **add a "real reading" path** (see #C2) |
| Delete sensor (cascades) | ✅ working | **keep** |
| Sensor history charts (time-series, not just latest reading) | ❌ not built | **build** — Section C #C3 |
| Sensor calibration UI (manual offset, last-calibrated timestamp) | ❌ not built | **defer** to v2 — only matters with real hardware |
| Bulk sensor operations (assign N sensors to a field) | ❌ not built | **defer** — only matters at >20 sensors per farmer |

### Recommendations

| Feature | Status | My pick |
|---|---|---|
| Hybrid engine (moisture + weather + ICAR/TNAU nutrients + ML + image cross-check + seedling-specific) | ✅ working — well-designed | **keep** |
| Why-list with structured items (category, icon, severity, title, detail) | ✅ just landed | **keep** |
| Data confidence meter | ✅ working | **keep** but see Section C #C4 (math is asymmetric) |
| Risk alerts (forecast disagreement, crop mismatch, cold/heat stress) | ✅ working | **keep** |
| Generate via POST /recommend/{field_id} | ⚠️ POST-on-mount issue (audit #41) | **fix** — Section C #C5 |
| Recommendation history per field | ✅ working | **keep** |
| Detailed feedback (followed yes/no, outcome, notes) | ✅ working (outcome bug fixed in Batch 4) | **keep** |
| Recommendation comparison (this week vs last week, trend over time) | ❌ not built | **build** — Section C #C6 |

### Visual AI (image)

| Feature | Status | My pick |
|---|---|---|
| Upload field photos (JPEG/PNG/WebP from phone) | ✅ working | **keep** |
| Stored as base64 data URLs in DB | ✅ working (no parallel disk write after Batch 2) | **keep** but reconsider when image volume grows |
| Multi-provider AI analysis | ✅ working | **keep** |
| Crop mismatch detection | ✅ working | **keep** |
| Soil↔image cross-validation | ✅ working | **keep** |
| Source badges (Phone/Drone) | ✅ working (dead code dropped in Batch 6) | **keep** |
| Pest/disease library (browse known issues with images) | ❌ not built | **build** — Section C #C7 |
| Image gallery filtering (by date, by issue) | ❌ not built | **defer** — only matters at >50 photos |

### Weather

| Feature | Status | My pick |
|---|---|---|
| Live weather + 3-day forecast (Open-Meteo) | ✅ working | **keep** |
| Per-field LSTM rainfall prediction | ⚠️ degraded (uses fake temp_min) | **fix** — Section C #C1 |
| Ensemble (0.7 × API + 0.3 × LSTM) with graceful fallback | ✅ working | **keep** |
| Conflict-detection alerts | ✅ working | **keep** |
| Multi-field weather map view (all fields on one Leaflet map) | ❌ not built | **build** — Section C #C8 |

### UX, polish, ops

| Feature | Status | My pick |
|---|---|---|
| Multilingual (EN / HI / TE / TA), 428 keys at parity | ✅ working | **keep** — major differentiator |
| Light + dark mode | ✅ working | **keep** |
| Mobile bottom navigation | ✅ working (after AppLayout) | **keep** |
| Profile (view + update name, phone, language) | ✅ working | **keep** |
| Print stylesheet for "PDF export" via window.print() | ⚠️ basic, doesn't match a real report | **build** real PDF — Section C #C9 |
| Request-ID logging + JSON logs | ✅ working | **keep** |
| /health, /ready endpoints | ✅ working | **keep** |
| Email via Resend HTTP API | ✅ working | **keep** |

---

## B. What's missing — common agritech features

Common to most agritech products. For each: **build now / defer / drop**.

| Feature | Why it matters | My pick |
|---|---|---|
| **Alerts / notifications** (push/SMS/email when thresholds breach) | Core agritech value prop. Without alerts, the user has to remember to check the app. | **build** — Section C #C10 (start with email+SMS, push later) |
| **Real PDF export** (styled report, not screen print) | Farmers share advice with family/peers. Government schemes need printed records. | **build** — Section C #C9 |
| **CSV data export** (sensor readings, recommendations history) | Power users + agronomists analyzing trends in Excel | **defer** — only ~5% of users will use it |
| **Recommendation comparison over time** | Lets users see "is the AI getting better for me?" | **build** — Section C #C6 |
| **Field activity log / audit trail** (every action timestamped) | Trust + debugging when a recommendation looks weird | **defer** to v2 |
| **Real-time sensor updates** (WebSocket) | Nice but expensive to operate; polling every 5 min is fine | **drop** for v1 |
| **Crop yield prediction** | Big feature, separate ML pipeline, requires historical yield data | **defer** to v2 |
| **Pest/disease library with images** | Educational + helps users self-diagnose before paying for ML | **build** — Section C #C7 |
| **Sensor history charts** | Already a critical gap — users only see "latest" readings | **build** — Section C #C3 |
| **Multi-field map view** | Especially useful as user adds more fields | **build** — Section C #C8 |
| **Bulk operations** | Only matters at scale (>20 sensors / >10 fields) | **defer** |
| **Search / global command palette** | Nice but premature | **drop** for v1 |

---

## C. Indian-context features that may matter

For each: **build now / defer / drop**, with a note on user-segment fit (smallholder vs commercial).

| Feature | Why it matters in India | My pick |
|---|---|---|
| **Offline support / PWA** | Connectivity is intermittent in rural areas. PWA install on phone = always available. | **build** — Section C #C11. Cheap with Vite + Workbox. |
| **SMS alerts** (when farmer is offline) | Many farmers don't have notifications enabled, or don't open apps daily | **build** — Section C #C10 (combined with alerts) |
| **Voice input for notes** | Literacy barrier — typing in HI/TA/TE on a small phone keyboard is painful | **defer** — needs Web Speech API + careful UX. v2. |
| **Low-data mode** (compress images, skip charts on metered connection) | 4G data is cheap but not free in rural India | **build** — Section C #C12. Cheap: navigator.connection + image compression on upload. |
| **Vernacular crop names** (TNAU dataset uses regional names: cholam = sorghum, ragi = finger millet) | Currently only normalizes 6 crops. Indian farmers know hundreds of regional names. | **build** — Section C #C13 |
| **Government scheme integration** (PM-KISAN, soil health card data) | Builds trust ("the app knows my entitlements"). Probably needs partnerships. | **defer** until pilot reveals real demand |
| **Mandi price feed** (current crop prices at nearest mandi) | High-value — farmers care about price as much as yield | **build** — Section C #C14. Free APIs from data.gov.in / agmarknet exist. |
| **WhatsApp-first sharing** (export recommendation as WhatsApp-friendly image) | WhatsApp is THE communication channel in rural India | **build** — Section C #C15. Tiny scope. |
| **Krishi Vigyan Kendra (KVK) directory** (find your local agricultural extension office) | High-trust offline complement to AI | **defer** until pilot reveals demand |

---

## D. Quick-win features I'd add

Not strategic — just things that make the product feel polished. Each is <1 day.

| Feature | Effort | My pick |
|---|---|---|
| **"Field is healthy" empty state on Dashboard** when no urgent issues exist | 30 min | **build** |
| **Last-updated timestamps** on every card ("Sensor last reading: 2 hours ago") | 1 hour | **build** |
| **Skeleton loaders** for slow API calls instead of spinners | 1 hour | **build** |
| **"Continue where you left off"** quick link on Dashboard (last viewed field) | 30 min | **build** — `storage.getLastFieldId()` already exists |
| **Onboarding tour** (3-step intro for new users on first login) | 1 day | **defer** — design after Phase C |
| **Crop wiki cards** (click on a crop name → see its requirements) | 1 day | **defer** |
| **Sensor health dashboard** (battery, last-seen, data quality per sensor) | 1 day | **build** — pairs well with #C3 |

---

## Priority recommendation

If you build the items I marked "build now" in priority order:

### Phase B-1: Foundation gaps (must-have, ~2 weeks)
1. **#C5** Fix `/recommend` POST-on-mount → cache + dedupe (1 day)
2. **#C1** Real temp_max/min in WeatherReading + LSTM retrain (2 days, includes Alembic migration)
3. **#C3** Sensor history charts (2 days — endpoint + Recharts component)
4. **#C10** Alerts/notifications via email + SMS (3 days — service + threshold UI + Twilio integration)
5. **#C11** PWA + offline shell (1 day — vite-plugin-pwa)
6. **#C8** Multi-field map view (1 day — already have Leaflet)

### Phase B-2: Agritech polish (~1.5 weeks)
7. **#C9** Real PDF export (2 days — react-pdf or server-side WeasyPrint)
8. **#C6** Recommendation comparison/trends (1 day — chart on history page)
9. **#C7** Pest/disease library (2 days — content + screen)
10. **#C13** Vernacular crop names (1 day — expand `_CROP_NAME_MAP`)
11. **#C14** Mandi price feed (2 days — agmarknet API + screen)
12. **#C15** WhatsApp share image (1 day)
13. **#C12** Low-data mode (1 day)

### Phase B-3: Quick wins (1 week)
14. All Section D items (~5–6 days)

### Deferred (not v1)
- Refresh tokens, multi-user, real-time updates, voice input, calibration, bulk ops, govt scheme integration, KVK directory, yield prediction, audit log, CSV export

**Total v1 (Phase B-1 + B-2 + B-3): ~5–6 weeks of build time.**

After that → Phase C (design revamp).

---

## What I need from you

1. **Confirm or override the top-level decisions (D1–D5).** They cascade.
2. **Walk through tables A, B, C and override anything where you disagree with my pick.** Edit this file directly.
3. **Tell me which Phase B-1 item to start on first.** My pick: **#C10 (alerts)** — it's the biggest user-value-per-day feature and unlocks a real "why use this app" moment. Second pick: **#C3 (sensor history)** because it's prep work for #C10's threshold UI.
