# Bowe's Mini Bus Service - Website

A static website for Bowe's Mini Bus Service (bus & minibus hire), styled after
the company logo (royal blue `#2B3990` + golden yellow `#FFD100`), ready to
deploy on **Vercel** with zero configuration. It's plain HTML/CSS/JS with no
build step.

## Pages

| Page | Purpose |
|------|---------|
| `/` (`index.html`) | Public home page: services, fleet showcase, photo gallery placeholders, contact details |
| `/booking.html` | Booking page: checks live availability against the fleet diary and submits a request with **pending review** status |
| `/admin/` | Staff/admin panel: analytics dashboard, booking review queue, availability diary, fleet & driver management |

## How the demo data works

There is **no backend yet**. Everything runs in the browser using
`localStorage`, seeded with example data on first visit. All reads and writes
go through one file:

```
assets/js/data.js   ->  window.BowesStore
```

When you're ready to wire up a real database (e.g. Vercel Postgres + API
routes, or Supabase), replace the functions in `BowesStore` with `fetch()`
calls. Nothing else in the site needs to change.

### Business rules already implemented

- Public bookings are always created as **pending**. An admin must approve.
- Approving a booking requires assigning a **bus** and a **driver**; only ones
  actually free on that date are offered.
- A bus is unavailable on a date if it's **in maintenance** or already has a
  confirmed booking that day. The availability diary and the public booking
  page both compute from this.
- Drivers have weekly **days off**; they're excluded from assignment on those
  days, and can't be double-booked on the same date.

## Placeholders to fill in

Search the HTML for `PLACEHOLDER` / `087 XXX XXXX`:

- **Phone number**: `index.html` contact strip + footer areas
- **Email address**: `index.html` contact strip
- **Location / town**: `index.html` contact strip (currently set to Portlaoise, Co. Laois)
- **Hero photo**: `assets/img/hero-*.jpg` is a free stock placeholder
  ([Pexels #7276715](https://www.pexels.com/photo/people-sitting-in-a-van-7276715/),
  Pexels licence). Replace both sizes with a photo of the Bowe's fleet, keeping the file names
- **Reviews and stats**: the ratings, passenger counts and testimonials are demo
  content. Replace with real reviews before going live

## Admin login

The admin panel at `/admin/` has a demo login gate: **any username and
password signs you in** (session-scoped). Real authentication should be added
alongside the backend.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project -> Import** this repository.
3. Framework preset: **Other** (no build command, output directory = root).
4. Deploy, that's it.
