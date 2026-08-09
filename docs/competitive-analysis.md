# Competitive analysis — 10 things to steal from best-in-class travel sites

Research pass benchmarking Bowe's Mini Bus Service against national coach operators,
European coach tech, direct Irish rivals, US charter marketplaces, airline/rail
booking funnels, and coach-operator back-office software.

Each item is one idea, grounded in a real gap in this repo. Ordered by
value-for-effort — the top four are the ones worth doing first.

---

## 1. Turn the booking reference into a "check my trip" page

**Who does it:** National Express *Manage My Booking* — two fields, ticket
reference + email, no account. View the journey, reprint the ticket, change or
cancel up to 24h before travel. FlixBus does the same and adds a Trip Tracker on
that same reference showing live status and delays. In both, the reference is a
permanent key to the trip's current state, not a receipt number.

**The gap:** `booking.js:193` mints a reference, shows it once on the success
screen, and never uses it again. Meanwhile `admin.js` already writes
`status: "confirmed"` *plus* an assigned `busId` and `driverId` — so the system
knows "you're confirmed, 16-seat Sprinter, driver Pat Bowe" and shows the
customer none of it. Every "any word on the wedding bus?" call is unpaid admin
time for a small operator.

**Build:** New `check-booking.html` cloning the `booking.html` shell. Add
`findBooking(ref, contact)` to `data.js` matching `id` case-insensitively and
requiring phone or email as a light second factor, so a guessed reference leaks
nothing. New `assets/js/check-booking.js` renders a status timeline
(Requested → Confirmed → Travelled) and resolves `busId`/`driverId` into real
vehicle and driver names. Link from the success panel, nav and footer.

**Caveat:** localStorage-only means lookup works on the booking browser today.
Fine for the demo, and it becomes the strongest argument for the real backend
that `data.js:1-9` already anticipates.

**Effort:** Small–Medium

> Two independent research agents — one on UK operators, one on European coach —
> landed on this same gap from completely different markets. Strongest signal in
> the whole pass.

---

## 2. Autosave the booking wizard so an interrupted booking resumes

**Who does it:** Baymard's travel-site work and Nielsen Norman Group's mobile
guidance both point the same way — save state generously, because the reason
users abandon is the work they'd have to repeat. Mobile form abandonment sits
around 81%, much of it people who started, got interrupted, came back to a blank
form. Research also shows a large share of users leave immediately when there's
no save-and-resume.

**The gap:** `booking.js` is a five-step wizard holding everything in the live
DOM. Close the tab at step 4 — after picking the date, checking availability and
typing the notes — and all of it is gone. This is the single highest-value fix
in the existing funnel, and it's cheap.

**Build:** In `assets/js/booking.js`, write form values to
`localStorage` under a `bowes_draft_v1` key on every `change` and on step
navigation; on load, if a draft exists and its date hasn't passed, restore the
fields and offer "Pick up where you left off?" with a discard option. Clear the
draft on successful submit alongside the existing `successBox` handling. No new
files, no dependencies.

**Effort:** Small

---

## 3. Add JSON-LD structured data, sitemap.xml and robots.txt

**Who does it:** Standard practice for every local service business that ranks.
Google requires `name` and `address` for a LocalBusiness rich result, and its
local docs now support review, FAQ and service markup — each of which can win
extra SERP real estate. Guidance is to use the most specific accurate subtype
rather than bare `LocalBusiness`.

**The gap:** `grep` for `application/ld+json` across this repo returns nothing.
There's no `sitemap.xml` and no `robots.txt`. For a small operator competing on
"minibus hire Portlaoise" and "wedding bus hire Laois", this is free visibility
being left on the floor — especially with the FAQ and review content already
written and sitting unmarked in `index.html`.

**Build:** Add a JSON-LD block to the `<head>` of `index.html` typed as
`AutoRental` or `TaxiService` under `LocalBusiness`, carrying name, address
(Portlaoise, Co. Laois), phone, `areaServed`, `openingHours` and the fleet as
`makesOffer`. Add `FAQPage` markup once real FAQs exist (see item 8). Create
`sitemap.xml` and `robots.txt` at root — Vercel serves them as static files with
no config change. Do **not** add `AggregateRating` until the reviews are real
(see item 4); fake rating markup is a manual-action risk.

**Effort:** Small

---

## 4. Replace the hardcoded testimonials with a real Google Reviews badge

**Who does it:** Standard across travel and local service. A Google rating block
carries credibility a "our customers love us" banner never will, because the
reviews live on a platform the business doesn't control — that perceived
independence is what makes it persuasive. Bridal retailer Grace Loves Lace
reported up to 87% more booking clicks after adding live review widgets.

**The gap:** `index.html:251-283` has three testimonials with invented names
("Murphy Wedding", "The Brennans") and hand-typed ★★★★★. The hero badge claims
"Rated 5.0 by local groups" with nothing behind it. A wedding customer spending
€400 can tell the difference, and unverifiable praise actively costs trust.

**Build:** Set up a Google Business Profile if there isn't one, then embed a
review widget or pull reviews via the Places API into a static JSON file
refreshed periodically. Replace the `.testi-card` contents in `index.html`;
swap the hero badge for the real rating and review count. Once genuine, this
unlocks honest `AggregateRating` markup in item 3.

**Effort:** Small (widget) / Medium (API + real profile)

---

## 5. Show an indicative price before asking for contact details

**Who does it:** CharterUP — enter pickup, destination, dates and passenger
count, and it returns real-time quotes from multiple operators with ratings and
vehicle photos, pitched as "charter a bus in under 60 seconds". GOGO Charters
runs a companion *Charter Bus Prices: How To Calculate Your Rental Costs* page
that explains the pricing model in public.

**The gap:** Bowe's asks for name, phone and email and gives back "pending
review" with no number attached. Every competing quote request the customer
sends out that evening is a chance to lose them. Price opacity is the norm among
Irish operators, which makes it a differentiator rather than a risk.

**Build:** Add a `estimateFare(distanceKm, passengers, returnTrip)` helper to
`data.js` using a published rate card (base fee + per-km + return multiplier),
and surface a clearly-labelled "typical price for a trip like this: €X–€Y,
confirmed when we come back to you" band on the recap step of `booking.html`.
Keep it a range, not a quote. Pair with a short public pricing page explaining
what's included — driver, fuel, tolls, VAT.

**Effort:** Medium — the hard part is agreeing the rate card with the client,
not the code.

---

## 6. Support multi-leg journeys in the booking form

**Who does it:** BusBooker and Sligo Coaches both build wedding transport around
multiple pickups and multiple runs — airport to hotel, hotel to church, venue to
hotel late that night — and Sligo assigns a transport coordinator to handle
last-minute amendments. Murray & Son push couples to book 2–3 months ahead.

**The gap:** `booking.js` submits exactly one `date`, one `time`, one `pickup`,
one `destination` and a `returnTrip` boolean. Real weddings don't fit that. The
seed data admits it — `bk_seed2` is the Walsh Wedding Party with the note "Two
runs may be needed" typed into a free-text box, which is the customer working
around the form. Weddings are the highest-margin segment and the form is worst
at exactly that job.

**Build:** Extend the booking record with an optional `legs: [{time, pickup,
destination}]` array in `data.js`, defaulting to a single leg so existing
records stay valid. In `booking.html`, add an "Add another pickup or run"
button on the journey step that clones the leg fieldset. Render the legs in
`buildRecap()` and in the admin booking detail view. Availability logic in
`busesAvailableOn` already keys on date, so same-day legs need no change.

**Effort:** Medium

---

## 7. Self-host the fonts and add a sticky tap-to-call bar on mobile

**Who does it:** Universal on local-service mobile sites — a fixed-position call
button that survives scrolling. Around 70% of mobile users use click-to-call to
reach a business, and a third of people calling from mobile search intend to buy.
On performance, self-hosting fonts removes a render-blocking external connection
and improves LCP, CLS and FCP.

**The gap:** `index.html:17-19` pulls Sora and Inter from `fonts.googleapis.com`
with `preconnect` — two extra DNS lookups and a render-blocking stylesheet
before any text paints, on the mobile connections most of this traffic arrives
on. And the only way to phone Bowe's from a mobile is to scroll to the contact
strip at `index.html:312` or the footer; `styles.css` has no persistent mobile
call affordance. Half this business is people ringing round for a quote.

**Build:** Download the two families as WOFF2 into `assets/fonts/`, declare
`@font-face` with `font-display: swap` at the top of `assets/css/styles.css`,
and delete the three `<link>` tags from both `index.html` and `booking.html`.
Separately, add a `.mobile-call-bar` fixed to the bottom of the viewport inside
the existing `@media (max-width: 760px)` block at `styles.css:1222` — two
buttons, "Call now" (`tel:`) and "Book online" — hidden on `booking.html` so it
never covers the wizard controls.

**Effort:** Small

---

## 8. Publish a safety and credentials strip

**Who does it:** The trust pattern across Airbnb, Booking.com and every serious
operator — surface the licensing and safety facts before the customer has to ask.
Irish coach operators lead with fleet age, accreditation and driver vetting.

**The gap:** Nothing on this site says Bowe's is licensed, insured, or that
drivers are vetted. Two of the four named target segments are safeguarding-
sensitive: school tours and weddings. A school secretary booking a trip for
16 children needs the PSV licence number, the insurance position and whether
drivers are Garda-vetted, and right now has to phone to find out — or books
someone whose site says it.

**Build:** New section in `index.html` between `#why` and `#reviews`: PSV
operator licence number, public liability cover, Garda-vetted drivers, CVRT
status, and the wheelchair-accessible lift already recorded on `bus_1` in
`data.js:33` but never mentioned publicly. Add a short FAQ block below it —
cancellation terms, deposit, what happens if a bus breaks down — which then
feeds the `FAQPage` markup in item 3.

**Effort:** Small (needs real details from the client, not code)

---

## 9. Build segment landing pages instead of one homepage section

**Who does it:** JJ Kavanagh — Ireland's largest private coach operator — runs
coach hire on a separate site from scheduled services, with a page per segment:
private hire, corporate, weddings, school, cruise transfers and on-shore
excursions. Each targets its own search intent with its own copy and its own
quote form.

**The gap:** All four of Bowe's segments are compressed into one "services"
grid at `index.html:137`, so the site has nothing to rank for "school tour bus
hire Laois" or "corporate coach hire Portlaoise" and nothing specific to say to
a buyer who arrives. One page cannot rank for four different intents.

**Build:** Add `services/weddings.html`, `services/schools.html`,
`services/sports.html`, `services/airport.html` reusing the `index.html`
header/footer shell — each with its own hero, segment-specific copy and photos,
relevant FAQs, and a "Book now" deep-link into `booking.html` that pre-selects
the trip type via query string. Link them from the services grid and the
footer, and list them in the `sitemap.xml` from item 3.

**Effort:** Medium — mostly copywriting

---

## 10. Track vehicle and driver compliance expiry in the admin panel

**Who does it:** Traxsit, an Irish fleet platform, schedules CVRT, 13-week
checks and tacho calibration with reminders ahead of time, tracking certificates,
motor tax, insurance and CPC per vehicle and driver with configurable warning
thresholds and a morning digest. Convey does the same for PSV operators.

**The gap:** `data.js` fleet records carry only `status` and free-text `notes` —
`bus_4` says "In for service until further notice", which is compliance tracked
as a sentence. Drivers have `licence: "D"` with no expiry and no CPC date.
For an Irish operator, a lapsed CVRT or an expired CPC means a vehicle off the
road at zero notice, and the diary has no way to see it coming. This is the one
item that protects revenue rather than winning it.

**Build:** Extend fleet records in `data.js` with `cvrtDue`, `insuranceDue`,
`motorTaxDue`, `tachoCalibrationDue`, and driver records with `licenceExpiry`
and `cpcExpiry`. Add a `expiringSoon(data, days)` helper alongside the existing
`busesAvailableOn`. Surface it as a fifth stat tile in `renderStats()`
(`admin.js:95`) using the existing `.stat.attn` styling, and mark affected
vehicles in the availability diary. Optionally have `busesAvailableOn` treat a
vehicle with a lapsed CVRT as unavailable, the same way `maintenance` works today.

**Effort:** Medium

---

## Suggested order

| Phase | Items | Rationale |
|-------|-------|-----------|
| Quick wins | 2, 3, 7 | Small effort, no client input needed, immediate funnel and search gains |
| Needs client input | 4, 8, 5 | Real reviews, real credentials, real rate card — code is easy, facts are the blocker |
| Feature work | 1, 6, 10 | Genuine new capability; item 1 also makes the case for a real backend |
| Content push | 9 | Highest ceiling, mostly copywriting |

## Research notes

Two of ten research agents completed before the account hit its monthly spend
limit — both on the reference-lookup finding in item 1, reached independently.
The remaining eight territories were researched directly in-session. Direct
fetches to nationalexpress.com and coach.nationalexpress.com were blocked by the
egress proxy, so those findings come from National Express help documentation
and search results rather than the live booking flow.
