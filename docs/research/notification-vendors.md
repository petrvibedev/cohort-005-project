# Hosted notification vendors against Cadence's hard constraints

Research for [issue 2](https://github.com/petrvibedev/cohort-005-project/issues/2), part of the Notifications map ([issue 1](https://github.com/petrvibedev/cohort-005-project/issues/1)). All sources are first-party vendor pages (docs, pricing, terms, npm registry, vendor GitHub) fetched on 2026-11-18.

**How to read the evidence.** Pages were read through a fetch tool that returns a condensed reading of each page, so short quoted fragments are reliable but should be re-opened before anyone relies on exact wording or signs up for a plan. "Inferred" marks a conclusion the page does not state. Nothing was signed up for or tried in a sandbox.

## Answer

Ranked shortlist:

1. **Knock**: passes all five constraints, and the free plan (10,000 messages a month) includes the feed, preferences, batching, broadcasts and audiences with no feature gating. The first paid plan is $250 a month.
2. **Novu** (Novu Cloud): passes all five, with the cheapest paid step ($30 a month) and US or EU hosting on every plan. The free plan stops hard at 10,000 workflow runs, allows 5 workflows and keeps feed items for 30 days, and its marketing-email support is thinner than Knock's.
3. **SuprSend**: passes all five, with VAPID web push and lists and broadcasts on the free plan. Preferences and batching are only on the $250 a month Business plan.

Dropped:

- **Courier**: browser web push is not documented anywhere in its docs (constraint 1 unverified), and digest and batching are listed under Enterprise only. It is otherwise strong and is the first to revisit if web push is confirmed.
- **MagicBell**: only transactional email is evidenced (no audience, campaign or unsubscribe feature), the free plan is 1,000 deliveries, the next plan is $249, and there is no batching and no maintained React hooks package.
- **Engagespot**: its marketing and pricing site returns 404, so the free tier and self-serve sign-up cannot be verified.
- **Pingram** (formerly NotificationAPI): the in-app and web push docs are gone after the rebrand, and `@pingram/react` is not on npm.
- **OneSignal**: no persistent per-user feed.
- **Customer.io**: no free plan; starts at $100 a month.
- **Stream Activity Feeds**: no email or web push evidenced; first paid plan is $499 a month.
- **Fyno, Braze, Iterable, CleverTap, Pushwoosh, Firebase**: sales-led or no public pricing, no free plan, or no web feed (details in [Other candidates](#other-candidates)).

## Hard constraints at a glance

| Vendor | 1. Email and web push later, incl. marketing | 2. Free or cheap tier | 3. React SDK | 4. Self-serve | 5. Headless feed |
|---|---|---|---|---|---|
| Knock | Pass (bring your own email provider; web push via FCM) | Pass: 10,000 messages free, then $250/mo | Pass | Pass | Pass |
| Novu | Pass with caveats (no segments, DIY unsubscribe; web push via FCM or Pushpad) | Pass: 10,000 runs free, then from $30/mo | Pass | Pass | Pass |
| SuprSend | Pass (lists, broadcasts, VAPID web push) | Pass, gated: 10,000 free; preferences and batching at $250/mo | Pass | Pass (paid inferred) | Pass |
| Courier | Unverified: marketing email passes, web push undocumented | Pass: 10,000 sends free, then $0.005 per send | Pass | Pass | Pass |
| MagicBell | Unclear: native web push, but transactional email only | Thin: 1,000 free, then $249/mo | Pass (components only) | Pass | Pass, without hooks |

All five vendors send email through a provider account Cadence brings (Postmark is supported by Knock, Novu, SuprSend and Courier), so the email provider's cost and terms sit on top of the vendor's.

## Knock

### Hard constraints

1. **Email and web push: pass.**
   - Email goes to a provider you connect: Amazon SES, Postmark, Resend, SendGrid, Mailgun, SMTP and others; Knock's own sending is "testing only". [Email overview](https://docs.knock.app/integrations/email/overview.md)
   - Marketing-style email: "Broadcasts are a way to power one-time, cross-channel messaging to your users through Knock", optionally scheduled, targeting an audience, all users or a CSV. Broadcasts are not callable through the API and recipients must already be Knock users. [Broadcasts](https://docs.knock.app/concepts/broadcasts.md)
   - "An audience is a user segment that you can use to target users for workflows, guides, and broadcasts"; audiences are dynamic (conditions) or static (API, CSV), and a workflow can trigger on audience entry. [Audiences](https://docs.knock.app/concepts/audiences.md)
   - "Knock provides built-in support for commercial email unsubscribe functionality"; marking a workflow or broadcast Commercial adds the unsubscribe headers. [Commercial unsubscribe](https://docs.knock.app/preferences/commercial-unsubscribe.md)
   - Terms restrict unsolicited messages and purchased lists, not marketing as such. [Acceptable use policy](https://knock.app/legal/acceptable-use-policy)
   - Web push: "Knock does not have a first-party web push channel." "Instead, you'll use FCM to send messages to a user's browser." That needs a Firebase project and a service worker. [Web push with FCM](https://docs.knock.app/tutorials/sending-web-push-notifications-with-fcm.md)
   - Inferred: a newsletter is a commercial broadcast to an audience; an abandoned-purchase reminder is a workflow with a delay step. No page names either case.
2. **Free or cheap tier: pass.** [Pricing](https://knock.app/pricing), [Plans](https://docs.knock.app/manage-your-account/knock-plans.md)
   - Free: $0, up to 10,000 messages a month, no credit card, described as "For evaluation or small-scale deployments".
   - Starter: $250 a month with 50,000 messages, then $0.005 per message. Removes Knock branding.
   - Counted unit: "A message sent is a single message delivered to a single user on a single channel." A feed item is one message, and messages in any environment count.
   - Over the free limit: "We don't hard cap your messages"; Knock gets in touch about billing.
   - Not gated on Free: in-app feeds, preferences, batching, broadcasts, unlimited workflows, environments and team members.
   - Enterprise only: per-tenant preferences, rendering more than 10 batch activities, SSO, audit logs.
3. **React SDK: pass.** `@knocklabs/react` 0.15.1, published 2026-11-06, first-party, peers React 17, 18 and 19. [npm registry](https://registry.npmjs.org/@knocklabs/react), [knocklabs/javascript](https://github.com/knocklabs/javascript)
4. **Self-serve: pass.** Free and Starter link to the dashboard sign-up; only Enterprise goes through sales. [Pricing](https://knock.app/pricing)
5. **Headless feed: pass.**
   - React hooks `useKnockClient`, `useNotifications`, `useNotificationStore`: "you can create fully custom notification UIs". [Headless feed](https://docs.knock.app/in-app-ui/react/headless/feed.md)
   - Plain JS client `@knocklabs/client`. [Custom UI](https://docs.knock.app/in-app-ui/feeds/custom-ui.md)
   - REST `GET /v1/users/{user_id}/feeds/{id}`, callable from the browser with the public key and a user token. [List feed items](https://docs.knock.app/api-reference/users/feeds/list_items.md)

### Facts for later decisions

- **Real-time**: websocket managed by the SDK; the socket event carries badge counts and the client refetches. No polling fallback is documented. [Socket behaviour](https://docs.knock.app/in-app-ui/feeds/socket-behavior.md)
- **States**: seen, read, interacted, archived, each reversible per item; bulk mark all as seen, read or archived. [Feed client](https://docs.knock.app/in-app-ui/javascript/sdk/feed-client.md)
- **Preferences**: a preference set keyed by `categories`, `channels`, `channel_types` and `workflows`, with an environment default; stored in Knock and enforced when a workflow runs. Headless through `usePreferences` or `knockClient.user.getPreferences()` and `setPreferences()`. [Preferences](https://docs.knock.app/preferences/overview.md), [Custom preference center](https://docs.knock.app/preferences/custom-preference-center.md)
- **Batching**: a batch step with an optional batch key (for example the comment id), fixed or sliding windows up to 90 days, and template variables `total_activities`, `activities`, `total_actors`. On all plans. [Batch function](https://docs.knock.app/designing-workflows/batch-function.md)
- **Identity**: "We recommend using your internal user identifier for the `id` value". Recipients passed inline on a trigger are upserted, so no prior sync is needed. [Identifying recipients](https://docs.knock.app/managing-recipients/identifying-recipients.md)
- **Browser auth**: public API key plus user id, with an optional RS256 user JWT signed by the server. Enforcement ("enhanced security mode") is off by default and the docs say to enable it before release. [Security and authentication](https://docs.knock.app/in-app-ui/security-and-authentication.md)
- **Node**: `@knocklabs/node` 1.41.1 (2026-11-10); trigger with `POST /v1/workflows/{key}/trigger`, up to 1,000 recipients, with an `Idempotency-Key` header. Workflows are defined in the dashboard, CLI or Management API. [Trigger API](https://docs.knock.app/send-notifications/triggering-workflows/api.md)
- **Retention**: "In-app feed notifications are available indefinitely"; logs 30 days below Enterprise. [Data retention](https://docs.knock.app/manage-your-account/data-retention.md)
- **Residency**: no region choice; "We expect to support EU data residency by the end of 2026." [Plans](https://docs.knock.app/manage-your-account/knock-plans.md)

## Novu (Novu Cloud)

### Hard constraints

1. **Email and web push: pass with caveats.**
   - Email goes to a provider you connect (SendGrid, SES, Resend, Postmark, SMTP and others). [Email integrations](https://docs.novu.co/platform/integrations/email.md)
   - Marketing-style email is list fan-out rather than a campaign tool. Topics "group subscribers under a shared label so that you can broadcast a message to many users with a single workflow trigger", up to 100,000 subscribers each. [Topics](https://docs.novu.co/platform/concepts/topics.md)
   - A broadcast endpoint triggers a workflow for all subscribers. [Broadcast event](https://docs.novu.co/api-reference/events/broadcast-event-to-all.md)
   - Not found: segments on subscriber attributes, a campaign scheduler, or built-in unsubscribe handling. "By default, Novu does not add any unsubscribe links to the email." [llms-full.txt](https://docs.novu.co/llms-full.txt)
   - Terms prohibit spam only. [Terms](https://novu.co/terms)
   - Web push only through third parties: "Desktop notifications for websites can be sent using FCM webpush", or Pushpad, or a push webhook you run. [FCM](https://docs.novu.co/platform/integrations/push/fcm.md), [Pushpad](https://docs.novu.co/platform/integrations/push/pushpad.md)
   - Inferred: an abandoned-purchase reminder is a workflow with a delay step; the delay cap is 1 day on Free and 7 days on Pro. [Limits](https://docs.novu.co/platform/developer/limits.md)
2. **Free or cheap tier: pass.** [Pricing](https://novu.co/pricing), [Billing](https://docs.novu.co/platform/account/billing.md), [Limits](https://docs.novu.co/platform/developer/limits.md)

   | | Free | Pro | Team |
   |---|---|---|---|
   | Price | $0, no card | from $30/mo | from $250/mo |
   | Workflow runs per month | 10,000 | 30,000+ | 250,000+ |
   | Extra runs | none (HTTP 402) | $1.20 per 1,000 | $1.20 per 1,000 |
   | Workflows | 5 | 20 | 100 |
   | Feed item retention | 30 days | 90 days | 90 days |
   | Max digest or delay window | 1 day | 7 days | 30 days |
   | Remove Novu branding | no | yes | yes |

   - Counted unit: "A workflow run is one execution of a workflow for one subscriber", whatever the number of steps or channels; runs in every environment count.
   - "Free stops new workflow runs at its 10,000 included runs until the billing period resets or you upgrade."
   - Branding on Free applies to the prebuilt Inbox and to emails. Inferred from the component source: a headless UI shows none. [Prepare for production](https://docs.novu.co/platform/inbox/prepare-for-production.md)
3. **React SDK: pass.** `@novu/react` 3.20.0, published 2026-11-16, first-party, peers React 18 and 19. [npm registry](https://registry.npmjs.org/@novu/react)
4. **Self-serve: pass.** Free, Pro and Team are "Get started"; "Paid plans can be purchased from billing settings in the Novu dashboard." [Billing](https://docs.novu.co/platform/account/billing.md)
5. **Headless feed: pass.** "Build a fully custom notification inbox with Novu's headless React hooks": `useNotifications`, `useCounts`, `usePreferences`; plain JS client `@novu/js`. [Headless mode](https://docs.novu.co/platform/inbox/headless-mode.md), [JavaScript SDK](https://docs.novu.co/platform/sdks/javascript.md)

### Facts for later decisions

- **Real-time**: websocket, with `notifications.notification_received` and `notifications.unread_count_changed` events. [JavaScript SDK](https://docs.novu.co/platform/sdks/javascript.md)
- **States**: read, seen, archived, snoozed; per-item and bulk (`readAll`, `seenAll`, `archiveAll`, `archiveAllRead`). Seen is one-way. [use-notifications](https://docs.novu.co/platform/sdks/react/hooks/use-notifications.md)
- **Preferences**: three levels (workflow defaults, subscriber per workflow and channel, subscriber global); critical workflows bypass them; stored in Novu per environment. Headless through `usePreferences` and REST. [Preferences](https://docs.novu.co/platform/concepts/preferences.md)
- **Batching**: a digest step groups by subscriber plus one optional payload key (for example `payload.postId`); on all plans, with the window capped by plan. [Digest](https://docs.novu.co/platform/workflow/add-and-configure-steps/configure-action-steps/digest.md)
- **Identity**: "Use your application's internal user ID as the `subscriberId`"; subscribers are created on the fly at trigger. [Subscribers](https://docs.novu.co/platform/concepts/subscribers.md)
- **Browser auth**: public `applicationIdentifier` plus `subscriberId`, with an optional `subscriberHash` (HMAC-SHA256 of the subscriber id with the secret key). HMAC is off by default. [Prepare for production](https://docs.novu.co/platform/inbox/prepare-for-production.md)
- **Node**: `@novu/api` 3.20.0; `novu.trigger({ workflowId, to, payload })` or `POST /v1/events/trigger`. The older `@novu/node` is deprecated. [TypeScript SDK](https://docs.novu.co/platform/sdks/server/typescript.md), [Trigger event](https://docs.novu.co/api-reference/events/trigger-event.md)
- **Residency**: "All plans support US and EU regions", chosen at account creation. [Security](https://docs.novu.co/platform/additional-resources/security.md)

## SuprSend

### Hard constraints

1. **Email and web push: pass.**
   - Email goes to a provider you connect (SendGrid, SES, Postmark, Mailgun, Resend, Mailjet). [Pricing FAQ](https://www.suprsend.com/pricing), [Docs index](https://docs.suprsend.com/_llms/documentation.txt)
   - "A broadcast sends the same notification to every user on a list in one request." "Use it for campaigns, newsletters and announcements". [Broadcast](https://docs.suprsend.com/docs/broadcast.md)
   - Lists can be filled by segment ("Filter users by their properties or the events they've performed"), CSV, database sync or API. [Lists](https://docs.suprsend.com/docs/lists.md)
   - Terms prohibit spam, not promotional use. [Terms](https://www.suprsend.com/terms)
   - Web push uses a VAPID key and a service worker, with no downstream provider. [React web push](https://docs.suprsend.com/docs/react-webpush.md)
2. **Free or cheap tier: pass, heavily gated.** [Pricing](https://www.suprsend.com/pricing)
   - Free: $0, 10,000 notifications a month, feed "with SuprSend branding", lists and broadcasts included, three workspaces. Over the limit: "We do not stop processing and sending your notification requests."
   - Essentials: $100 a month (billed annually), 50,000 notifications, $2 per extra 1,000, branding removed.
   - Business: $250 a month (billed annually), 50,000 notifications, $5 per extra 1,000. "Batching & digest" and "User preferences" start here.
   - Counted unit: one channel delivery to one user; a batched notification counts once.
3. **React SDK: pass.** `@suprsend/react-core` 2.5.0 (hooks, published 2026-11-17) and `@suprsend/react` 1.6.0 (drop-in UI), first-party, peer React 16.8 or later. [npm registry](https://registry.npmjs.org/@suprsend/react-core)
4. **Self-serve: pass for Free.** Sign-up needs no card; self-serve purchase of the paid plans is inferred (only Enterprise is "Custom"). [Pricing](https://www.suprsend.com/pricing)
5. **Headless feed: pass.** `SuprSendFeedProvider`, `useFeedClient()`, `useFeedData()`; plain JS in `@suprsend/web-sdk`. No inbox REST endpoints are documented. [Headless feed](https://docs.suprsend.com/docs/react-sdk-headless-feed.md), [JS feed](https://docs.suprsend.com/docs/js-inapp-feed.md)

### Facts for later decisions

- **Real-time**: a socket connection with `feed.new_notification` and `feed.store_update` events; the protocol is not named. [JS feed](https://docs.suprsend.com/docs/js-inapp-feed.md)
- **States**: seen, read, unread, archived, interacted, pinned; bulk `markAllAsRead()` and `markBulkAsSeen(ids)`. Same page.
- **Preferences** (Business plan): global channel opt-out, category, and channel within category. Headless through `suprSendClient.user.preferences` and REST. "The inbox channel preference is behind a feature flag and needs to be enabled for your account." [User preferences](https://docs.suprsend.com/docs/user-preferences.md), [Preference React SDK](https://docs.suprsend.com/docs/preference-react-sdk.md)
- **Batching** (Business plan): "Batch node aggregates multiple triggers into a single batch output to send one consolidated notification", with a batch key such as `post_id`. [Batch](https://docs.suprsend.com/docs/batch.md)
- **Identity**: "Use a stable, unique identifier from your own system"; users are upserted by API, client `identify` or inline on trigger. [Users](https://docs.suprsend.com/docs/users.md)
- **Browser auth**: public API key plus an optional ES256 user JWT minted on the server; a toggle makes it mandatory. "For production workspaces public API Keys alone isn't enough as they are insecure." [Client authentication](https://docs.suprsend.com/docs/client-authentication.md)
- **Node**: `@suprsend/node-sdk` 1.15.1 (published 2026-05-19); REST `POST https://hub.suprsend.com/trigger/`, up to 100 recipients. [Trigger workflow API](https://docs.suprsend.com/reference/trigger-workflow-api.md)
- **Residency**: a custom region is Enterprise only; the default region was not found. [Pricing](https://www.suprsend.com/pricing)

## Dropped after full review

### Courier

- **Why dropped**: the docs index has pages for mobile push providers (APNs, FCM, Expo, OneSignal, Pusher Beams and others) but none for web push, browser push or service workers, so constraint 1 is unverified. [Docs index](https://www.courier.com/docs/llms.txt), [Push providers](https://www.courier.com/docs/integrations/push/overview.md)
- The pricing comparison lists "Digest & batching" under Enterprise only, though the batch node docs state no plan. [Pricing](https://www.courier.com/pricing), [Batch node](https://www.courier.com/docs/journeys/nodes/batch.md)
- **What it does well**:
  - Marketing email is explicit: "Use a broadcast for one-off sends: newsletters, product launches, and policy updates", to lists or rule-based audiences. [Broadcasts](https://www.courier.com/docs/broadcasts/overview.md), [Lists and audiences](https://www.courier.com/docs/recipients/lists-and-audiences/overview.md)
  - Cheapest growth path: 10,000 sends a month free, then $0.005 per send with no plan fee; the feed has no fee of its own. [Pricing](https://www.courier.com/pricing), [Billing](https://www.courier.com/docs/workspaces/billing.md)
  - `@trycourier/courier-react` 9.3.5 (2026-11-09, React 18 or later) with a headless `useCourier` hook; `@trycourier/courier-js` for plain JS. [Build a custom inbox](https://www.courier.com/docs/in-app/build-a-custom-inbox.md)
  - Browser auth is a mandatory JWT issued by the server through `POST /auth/issue-token`. [Authenticate users](https://www.courier.com/docs/in-app/authenticate-users.md)
  - EU hosting (Ireland) on paid plans. [Datacenters](https://www.courier.com/docs/workspaces/datacenters.md)
- States are read, opened and archived; real-time is a websocket; preferences are per topic with per-channel routing. [How the inbox behaves](https://www.courier.com/docs/in-app/how-the-inbox-behaves.md), [Preferences](https://www.courier.com/docs/recipients/preferences/overview.md)

### MagicBell

- **Why dropped**:
  - Email is positioned as transactional only ("Provider agnostic Transactional Email Notifications API for Developers"); no audience, campaign, scheduling or unsubscribe feature was found. [Email](https://www.magicbell.com/email), [Broadcast primitive](https://www.magicbell.com/docs/primitive/broadcast)
  - Free plan is 1,000 deliveries a month; the next plan is $249 a month for 50,000. [Pricing](https://www.magicbell.com/pricing)
  - No batching or digest feature was found. [Workflows](https://www.magicbell.com/workflows)
  - The hooks package `@magicbell/react-headless` is deprecated; `@magicbell/react` 1.14.0 (2026-07-29) ships components only, so a custom feed means writing a state layer over `magicbell-js`. [npm registry](https://registry.npmjs.org/@magicbell/react-headless), [magicbell-js](https://www.magicbell.com/docs/libraries/magicbell-js)
- **What it does well**: native Web Push with VAPID keys, and a mandatory HS256 user JWT. [Web push](https://www.magicbell.com/docs/channels/web_push), [User authentication](https://www.magicbell.com/docs/api/authentication/user)

## Other candidates

| Vendor | Result | Evidence |
|---|---|---|
| Engagespot | Unverifiable | Docs are live and show a feed, React hooks and US or EU regions, but `engagespot.co` and its pricing page return 404. [Docs](https://docs.engagespot.co/docs/introduction/getting-started) |
| Pingram (formerly NotificationAPI) | Fail | Now leads with email, SMS and voice; in-app, web push and React SDK doc pages return 404 and `@pingram/react` is not on npm. [Docs](https://www.pingram.io/docs/) |
| OneSignal | Fail (no feed) | It "does not currently store the history of messages sent to each individual user." [Activity feed guide](https://documentation.onesignal.com/docs/en/create-an-activity-feed.md) |
| Customer.io | Fail (price) | Has a headless web inbox, but "Starts at $100 per month" with no free plan. [Pricing](https://customer.io/pricing) |
| Stream Activity Feeds | Fail | Notification feed with seen and read state, but no email or web push evidenced; first paid plan is $499 a month. [Pricing](https://getstream.io/activity-feeds/pricing/) |
| Fyno | Fail | No public pricing, demo-led; headless hooks are React Native only. [Docs index](https://fyno.io/docs/llms.txt) |
| Firebase | Fail (no feed) | In-App Messaging covers iOS, Android and Flutter only. [Docs](https://firebase.google.com/docs/in-app-messaging) |
| Braze | Fail | "Braze does not offer a free plan at this time." [Pricing](https://www.braze.com/pricing) |
| Iterable | Fail | No public prices; "Book a demo". [Pricing](https://iterable.com/pricing/) |
| CleverTap | Fail | No permanent free plan. [Pricing](https://clevertap.com/pricing/) |
| Pushwoosh | Fail | No first-party React web SDK or web inbox page. [Docs index](https://docs.pushwoosh.com/llms.txt) |

Not screened: Liveblocks Notifications, Sendbird, CometChat, Airship, MoEngage, Beamer.

## Not verified

- **Free plan in production**: no vendor states outright that its free plan may be used in production. Knock says "small-scale deployments"; Novu and SuprSend give every account a production environment.
- **Branding in a headless UI**: Knock, Novu and SuprSend put branding on the free plan's prebuilt feed. That a custom UI shows none is inferred from component source (Knock, Novu) or assumed (SuprSend); no doc says so.
- **Batched feed items**: whether a batch updates an existing feed item or produces one item per closed batch is not stated by Knock or SuprSend.
- **Novu pricing table**: the per-plan ticks for Inbox, Preferences, Headless components, Topics and Digest are icons that could not be read; no doc gates them beyond the limits above. The Pro volume tiers above 30,000 runs were also unreadable.
- **Courier**: browser web push through OneSignal, FCM or Pusher Beams may work but is undocumented. The plan for digest and batching conflicts between the pricing table and the docs.
- **SuprSend**: feed item retention, the default hosting region, Safari web push, and whether paid plans are bought without a sales contact.
- **Knock**: current hosting region, and whether Free adds branding to emails or the hosted preference center.
- **Sign-up forms**: all are client-rendered and were not opened, so sign-in methods and card requirements at sign-up rest on the pricing pages.
- **Quote fidelity**: see the note at the top.
