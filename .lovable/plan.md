# Client Portal Feature Expansion + DMS Portal Management Module

Reference image ke mutabiq Client Portal ko expand karna hai (same DMS UI/UX tokens, AI Assistant chhod ke), aur DMS side pe ek naya module banana hai jahan se pura portal control ho.

## Part 1 — Client Portal (naye features, same UI/UX)

Reference image se derived, existing sidebar ke sath merge:

**Sidebar (grouped, current tokens):**
- Overview: Dashboard
- Work: Projects, Tasks (new), Approvals (new), Change Requests (new)
- Support: Support Tickets (badge), Messages (new)
- Billing: Invoices & Payments (rename), Payments history (new sub-view)
- Content: Documents, Knowledge Base (new)
- Services: Services (new), Hosting & Domains (new)
- Meetings: Meetings
- Account: Notifications (new page), Profile & Settings (new)
- Bottom: "Need Help?" support card + Contact Support button

**Dashboard (image parity):**
- Welcome hero + "System Update" announcement card (data-driven from DMS)
- 5 KPI cards: Active Projects, Completed Projects (This Year), Open Tickets, Pending Invoices (PKR), Upcoming Meetings (This Week)
- Projects Overview list with per-project progress bar + due date
- Project Progress donut (Completed / In Progress / On Hold / Not Started)
- Notifications panel (right)
- Quick Actions: Create Ticket, Book Meeting, Upload File, Make Payment
- Invoices Summary, Tickets Summary, Payments Overview mini-cards
- Recent Activity feed
- Upcoming Meeting card with Join button

**New portal routes:**
- `portal.tasks.tsx` — client-visible tasks from PM module
- `portal.approvals.tsx` — approval requests queue (approve/reject with note)
- `portal.change-requests.tsx` — submit + track CRs
- `portal.messages.tsx` — thread-based messages with account manager (reuses communication store)
- `portal.payments.tsx` — payment history + Make Payment action
- `portal.services.tsx` — services subscribed (from catalog)
- `portal.hosting.tsx` — hosting/domain records with expiry
- `portal.knowledge.tsx` — KB articles (read-only)
- `portal.notifications.tsx` — full notifications list
- `portal.profile.tsx` — profile, password, 2FA-lite, preferences

AI Assistant intentionally skipped.

## Part 2 — DMS "Client Portal Management" Module

New route `src/routes/portal-admin.tsx` (sidebar item: "Client Portal") — single control center:

**Tabs:**
1. **Clients & Access** — list portal clients (from `dms:clients_v2`), toggle portal access, reset password, resend invite, view last login, impersonate.
2. **Visibility Rules** — per-client toggles for what shows in portal (Projects, Invoices, Tickets, Docs, Meetings, Tasks, Approvals, CRs, Services, Hosting, KB).
3. **Announcements** — create the "System Update" cards shown in portal dashboard (title, body, CTA, audience: all/specific clients, expiry).
4. **Approvals Queue** — DMS side of portal approvals; create requests, see client responses.
5. **Change Requests** — inbox of CRs from clients; assign, status, convert to project task.
6. **Messages** — unified inbox mirroring portal messages threads.
7. **Knowledge Base** — CRUD articles/categories published to portal.
8. **Notifications** — broadcast/targeted notifications with type + link.
9. **Portal Settings** — branding (logo/colors mirror DMS), captcha on/off, session length, allowed features globally.
10. **Activity & Logs** — client portal login history, page views, downloads.

All data local-first via `dms:portal_*` keys (announcements, approvals, change_requests, messages, kb_articles, portal_notifications, portal_visibility, portal_settings, portal_logs) and read by matching portal pages, following existing pattern.

## Files to create
- Portal pages (9 new route files listed above)
- `src/routes/portal-admin.tsx` (DMS module, tabbed)
- `src/lib/portal-data.ts` — shared keys, types, helpers (getVisibility, listAnnouncements, etc.)

## Files to modify
- `src/routes/portal.tsx` — sidebar grouping + new nav entries, "Need Help?" card, top-bar tweaks
- `src/routes/portal.index.tsx` — announcement banner, 5-card KPI row, donut, quick actions grid, summary cards, upcoming meeting card
- `src/routes/portal.invoices.tsx` — Payments tab link / Make Payment action
- `src/components/dms/Sidebar.tsx` — add "Client Portal" nav entry
- `src/router.tsx` / route tree auto-updates

## Not doing
- AI Assistant panel in portal (explicitly excluded)
- New backend tables — reusing existing Supabase tables + localStorage pattern per project convention
- Real payment gateway (Make Payment logs an intent; wiring to Stripe/Paddle only if you ask)

## Notes
- All styling uses existing DMS design tokens (bg-card, border, primary, muted-foreground) — no hardcoded colors.
- Icons: Lucide, matching current portal style.
- Data flows: DMS admin edits → localStorage/Supabase → portal pages read filtered by logged-in client identity.
- Given size, I will ship in one pass; expect a longer build.

Confirm and I'll build it.
