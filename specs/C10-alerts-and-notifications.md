# Spec: C10 — Alerts & Notifications

> **Status:** Proposed. Awaiting user sign-off before implementation.
> **Phase:** B-1 (foundation gaps), highest priority per the inventory.
> **Effort estimate:** 3–4 working days.

## Why

Today, RootSphere is pull-only: a farmer has to remember to open the app and check on their fields. The recommendation engine already knows when a moisture deficit, pH drift, or weather risk is happening — it just has no way to *tell the farmer*. Alerts close that loop.

This is the single biggest user-value-per-day feature on the inventory. Without it, the app is a dashboard. With it, the app is an assistant.

## Goals (v1)

1. A farmer can be notified when something on their field needs attention, **without opening the app**.
2. The system has **sensible defaults** out of the box — a new farmer doesn't have to configure thresholds before getting value.
3. A farmer can **customize** the thresholds and channels per field.
4. Notifications are **rate-limited** so a stuck sensor or persistent condition doesn't spam.
5. Multilingual: SMS / email body in the farmer's language.

## Non-goals (v1)

- Browser push notifications (deferred — pairs with PWA work, see #C11)
- Custom rule formulas / multi-condition rules / time-of-day windows
- WhatsApp Business API (Phase B-2 ties to #C15)
- Voice call alerts
- In-app real-time toast (would need WebSocket — not v1)

## Assumptions inherited from D1–D5

- **D1 (smallholder farmer)** → SMS is mandatory. Many farmers don't check email daily.
- **D2 (single-tenant)** → rules belong to one farmer; no sharing/team escalation.
- **D3 (web + PWA)** → no native push in v1. Email + SMS only.
- **D5 (>40% recommendation-followed)** → alerts must drive engagement; rate-limit aggressively to avoid alert fatigue.

If any of these change, this spec changes. Flag now if so.

---

## User stories

1. *"As a smallholder farmer, when soil moisture drops below the threshold for my rice field, I get an SMS so I can irrigate before the crop stresses."*
2. *"As a farmer, when heavy rain is forecast in the next 24h, I get an alert so I don't waste a fertilizer application."*
3. *"As a farmer who just registered a field, I want sensible defaults — I shouldn't have to know what a 'pH threshold' is to start getting useful alerts."*
4. *"As a farmer, when I'm getting too many alerts for the same condition, I want them to back off automatically."*
5. *"As a farmer, when I'm in the app, I see a list of recent alerts so I can review history."*

## Out-of-scope user stories (v2 / later)

- *"As an agronomist, I get alerted when any of my client farmers' fields trip a rule."* (multi-user, deferred)
- *"As a farmer, I get a daily summary email at 6am."* (digest mode, deferred)
- *"As a farmer, I configure quiet hours."* (deferred)

---

## Data model

Two new tables. Both Alembic migrations.

### `alert_rules`

| Column | Type | Notes |
|---|---|---|
| `id` | str (UUID) | PK |
| `farmer_id` | str FK farmers.id | required |
| `field_id` | str FK fields.id, **nullable** | null = applies to all the farmer's fields |
| `metric` | str | enum: `moisture`, `ph`, `n`, `p`, `k`, `temp_c`, `humidity`, `rainfall_24h_forecast` |
| `comparator` | str | enum: `lt`, `gt`, `lte`, `gte`, `outside_range` |
| `threshold` | float | for `outside_range`, see `threshold_high` |
| `threshold_high` | float, nullable | for `outside_range` (e.g., pH outside [5.5, 7.5]) |
| `severity` | str | enum: `info`, `warning`, `critical` |
| `channels` | str (CSV) | e.g. `"email,sms"` |
| `enabled` | bool | default true |
| `cooldown_minutes` | int | default 360 (6h) — minimum gap between fires for the same rule |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Indexes: `(farmer_id, enabled)`, `(field_id, metric)`.

### `alerts`

| Column | Type | Notes |
|---|---|---|
| `id` | str (UUID) | PK |
| `rule_id` | str FK alert_rules.id | |
| `field_id` | str FK fields.id | denormalized for query speed |
| `fired_at` | datetime | |
| `metric_value` | float | the value that tripped the rule |
| `severity` | str | snapshot of rule.severity at fire time |
| `message` | str | rendered notification body (already i18n'd at fire time) |
| `acknowledged_at` | datetime, nullable | |
| `email_delivered_at` | datetime, nullable | |
| `email_error` | str, nullable | |
| `sms_delivered_at` | datetime, nullable | |
| `sms_error` | str, nullable | |

Indexes: `(field_id, fired_at desc)`, `(rule_id, fired_at desc)`.

### Cascade behavior

- Delete farmer → cascade rules + alerts (already true via Field cascade chain)
- Delete field → cascade rules where `field_id = X`, alerts where `field_id = X`
- Disable rule → existing alerts retained, new alerts not fired

---

## API endpoints

All under `/alerts/`. All require JWT, scoped to `farmer.id`.

### Rules

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts/rules` | List farmer's rules. Query: `field_id` (filter), `enabled` (filter). |
| `POST` | `/alerts/rules` | Create rule. Body: `{ field_id?, metric, comparator, threshold, threshold_high?, severity, channels[], cooldown_minutes? }` |
| `GET` | `/alerts/rules/{id}` | Read |
| `PUT` | `/alerts/rules/{id}` | Update (partial) |
| `DELETE` | `/alerts/rules/{id}` | Delete |
| `POST` | `/alerts/rules/seed-defaults` | Idempotent: install/refresh the default rules for a field. Used after CreateField. |

### Alerts (the fire history)

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts` | List farmer's alerts. Query: `field_id`, `acknowledged` (true/false/all), `since` (datetime), `limit` (default 50, max 200). |
| `GET` | `/alerts/unread/count` | Returns `{ count: int }`. For the bell badge. |
| `POST` | `/alerts/{id}/acknowledge` | Mark single as acknowledged. |
| `POST` | `/alerts/acknowledge-all` | Body: `{ field_id? }`. Bulk acknowledge. |

No public endpoint to *create* an alert — only the rule evaluator does that.

---

## Rule evaluation logic

Where it runs:

1. **On sensor ingest** (`POST /ingest/sensor`, also `/sensors/{id}/simulate`): evaluate moisture/pH/NPK rules for that field synchronously. Fast (single field, single reading).
2. **On weather refresh** (today: triggered by `create_field` and `update_field`): evaluate rainfall/temperature/humidity rules. Synchronous.
3. **No background polling for v1.** Rules only evaluate when new data arrives. Simpler, no scheduler needed.

Algorithm per evaluation:

```
for rule in active_rules_for_field:
    if rule.metric != metric_just_updated:
        continue
    if not comparator_matches(reading, rule):
        continue
    last_fire = latest_alert_for_rule(rule)
    if last_fire and fired_within_cooldown(last_fire, rule.cooldown_minutes):
        continue  # rate-limited
    create alert + send notifications + persist
```

**Cooldown semantics:** if a rule fires at T0, and the same rule would fire again at T0+5min, suppress. After T0+cooldown_minutes, eligible again. Means a stuck sensor in a low state alerts once per 6h, not every reading.

**Severity escalation (v2):** if a rule trips repeatedly, bump severity. Out of scope for v1.

---

## Default rules

When a field is created, seed these rules automatically (channels: email+sms, enabled, cooldown_minutes=360):

| Metric | Comparator | Threshold | Severity | Why |
|---|---|---|---|---|
| `moisture` | `lt` | crop-specific from `MOISTURE_THRESHOLDS` (50 for rice, 30 for wheat, etc.) | critical | irrigation needed |
| `ph` | `outside_range` | [5.5, 7.5] | warning | pH out of safe range |
| `rainfall_24h_forecast` | `gt` | 30 (mm) | info | heavy rain coming, defer fertilizer |
| `temp_c` | `lt` | 10 | critical | cold stress, especially seedlings |
| `temp_c` | `gt` | 38 | critical | heat stress |

Implementation: `crud.create_field` calls `crud.seed_default_alert_rules(field)` after the field is committed. Idempotent so it can be re-run.

Smallholder farmer can disable/edit any of these per field.

---

## Notification delivery

### Email

Re-use existing `services/email.py` (Resend HTTP API). Already wired for password reset.

Template: short subject + body, language-aware. Subject: `[RootSphere] {field_name}: {metric_label} {direction} threshold`. Body: 2 short paragraphs + CTA link to `/field/{id}`.

### SMS

**New integration.** Recommendation: **MSG91** (India-focused, cheaper than Twilio for the Indian market, supports Hindi/Tamil/Telugu Unicode SMS).

Alternatives:
- **Twilio** — global, easy, more expensive for India (~₹0.25/SMS vs MSG91 ~₹0.12)
- **Gupshup** — also India, comparable to MSG91
- **AWS SNS** — viable if already on AWS

Need to confirm with user (decision **D-SMS** below).

Wrapper: `services/sms.py` with one function `send_sms(phone, body, lang)`. Provider behind interface so we can swap.

Env vars:
- `SMS_PROVIDER` (default `msg91`)
- `MSG91_AUTH_KEY`
- `MSG91_SENDER_ID` (e.g. `RTSPHR`)
- (For Twilio fallback: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`)

Phone number requirements:
- Backend already stores `phone` on Farmer
- Validate at registration: must be valid Indian E.164 (`+91XXXXXXXXXX`)
- Reject SMS send if phone is empty or malformed; log and mark `sms_error`

### Channel selection

Each rule has `channels: ["email", "sms"]`. Default rules use both. Farmer can edit per rule. If user has no email (Google SSO accounts may have email), still send email since OAuth provides email. If phone is missing, SMS is silently skipped + `sms_error="no phone on file"`.

---

## Frontend surfaces

### 1. AppLayout — alert bell

Add a notification bell icon in the top header (between theme toggle and language picker). Badge shows unacknowledged count. Click → opens dropdown with last 5 alerts + "View all" link to a new `/alerts` page.

```
[logo] [Dashboard][Fields][Sensors] ... [theme][🔔 3][lang][logout][profile]
```

`useUnreadAlerts()` hook polls `/alerts/unread/count` every 60s.

### 2. FieldDetail — alert rules section

New collapsible card on FieldDetail showing the rules for that field. Lists each rule with its threshold, channels, enabled toggle. Buttons: "Add rule", "Edit", "Delete", "Restore defaults" (idempotent reseed).

Default state: collapsed, with a 1-line summary ("5 rules active, 1 alerted in the last 24h").

### 3. New `/alerts` page

Full alert inbox. List of fired alerts grouped by date. Each row: severity icon, field name, metric + value, fired time ago, ack button. Filters: by field, by severity, by acknowledged status.

Add to nav? **No** — the bell is the entry point. Mobile users get the same bell on the bottom nav.

### 4. Profile — notification preferences

Add a section: "Notifications". Show: phone (read-only with "edit profile to change"), default channels for new rules, per-language preview of an example SMS. No global "mute all" — they can disable per-rule.

---

## Reuse from existing code

- `recommendation.py:MOISTURE_THRESHOLDS` — already crop-specific. Reuse for default moisture rule.
- `recommendation.py:SEEDLING_MOISTURE_THRESHOLDS` — for seedling-stage fields, override default threshold.
- `services/email.py:send_reset_code` — pattern to follow for `send_alert_email`.
- `services/weather_ml.py:predict_ensemble` — already produces `rainfall_24h_forecast`; the alert evaluator just reads the latest forecast row from `WeatherReading`.
- `frontend/.../components/AppLayout.tsx` — drop the bell here.
- `frontend/.../components/ui/dialog.tsx` — for "Add rule" / "Edit rule" modals.
- `frontend/.../i18n/locales/` — add ~30 new keys (rule labels, threshold descriptions, alert messages).

---

## Acceptance criteria

1. New farmer registers → creates a field → 5 default rules auto-installed → field's first sensor reading triggers a moisture alert if below threshold → farmer receives SMS in their selected language within 30 seconds.
2. Farmer disables a rule → that condition no longer fires alerts.
3. Same condition persists for 24h with a reading every 5min → only ONE alert fires per 6h cooldown window (4 total in 24h, not 288).
4. Farmer acknowledges all alerts → bell badge → 0.
5. Farmer deletes a field → all its rules + alerts cascade.
6. SMS provider is down → email still delivers; alert row shows `sms_error` populated.
7. Farmer registered with Google SSO and no phone → SMS silently skipped, email still delivers.
8. Bell badge polls every 60s; visible within 60s of a new alert without page refresh.
9. All UI strings present in en/hi/ta/te.
10. `npx tsc --noEmit` and Docker stack boot clean after the migration.

---

## Implementation order (4 days)

### Day 1 — Backend foundations
- Alembic migration for `alert_rules` + `alerts`
- `models.py` additions (AlertRule, Alert)
- `schemas.py` additions
- `crud.py` rule + alert helpers
- `services/sms.py` provider interface + MSG91 implementation
- `services/email.py` `send_alert_email`
- Unit tests for rule comparator + cooldown logic

### Day 2 — Backend evaluation + endpoints
- `services/alerts.py:evaluate_rules` (sync, called from ingest)
- Wire into `/ingest/sensor`, `/sensors/{id}/simulate`, weather fetch path
- Default-rule seeding in `crud.create_field`
- All 8 alert endpoints (rules CRUD + alerts list + ack)
- Manual smoke test via curl

### Day 3 — Frontend rules UI + alert inbox
- `lib/api.ts` alertsApi module
- `types/api.ts` AlertRule, Alert, types
- FieldDetail "Rules" card with add/edit/delete dialog
- `/alerts` page (inbox)
- Profile "Notifications" section
- i18n keys (en first, then hi/ta/te)

### Day 4 — Bell + polish + tests
- AppLayout bell + dropdown + 60s polling hook
- Mobile bottom nav: bell with badge
- E2E manual test: register → field → simulate → SMS arrives
- Docs: update CLAUDE.md / README with the env vars
- Audit-triage doc: mark #C10 done

---

## Decisions to confirm before I start

| ID | Question | My recommendation |
|---|---|---|
| **D-SMS** | SMS provider? MSG91 / Twilio / Gupshup / Other / Skip SMS for v1 (email only) | **MSG91** — cheapest in India, multilingual SMS, ~₹0.12/SMS. If you don't have an account yet I can give you the signup link. |
| **D-PHONE** | Backfill: existing accounts may have invalid phones. Validate now (block SMS) or accept best-effort? | **Best-effort** for v1 — log `sms_error="invalid phone"`, still deliver email. Don't break existing accounts. |
| **D-COOLDOWN** | Default cooldown of 6 hours per rule too long / too short? | **6h is right for moisture/pH. Weather alerts (rain coming) at 12h. Temp extremes at 1h.** I'll set per-default-rule. |
| **D-DELIVERY** | SMS delivery: synchronous (block ingest until SMS sent) or async (queue + retry)? | **Synchronous with timeout=10s** for v1. No queue. If MSG91 is slow, log and move on. Async = needs Redis/Celery, scope creep. |
| **D-MIGRATION** | Two new tables: ship in one Alembic revision or two? | **One revision.** They're a coherent unit. |

---

## What I need from you to start

1. **Pick D-SMS** (or say "use my default = MSG91, I'll get an account")
2. **Confirm or override** D-PHONE, D-COOLDOWN, D-DELIVERY, D-MIGRATION
3. Say **"build C10"** and I start with Day 1.

Or if you'd rather review the spec carefully first — edit this file directly, I'll re-read before starting.
