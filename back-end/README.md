# Kaya Backend

Backend for Kaya Reservation System.

## Scripts

```bash
npm run start:dev
npm run start:prod
npm run migrate:up
npm run migrate:reset
npm run seed:baseline
npm run seed:all
npm test
```

## Notes

- Main API base: `/api/v1`
- Retell base: `/api/retell`
- Retell inbound webhook: `/api/retell/inbound-webhook`
- Retell routes are thin adapters over the real Kaya services, not a separate backend
- Operational defaults are centralized in [src/config/appSettings.js](/Users/basimhussain/Downloads/kaya reservation system/restaurant-table-reservation-system/back-end/src/config/appSettings.js:1)
- `RECEPTION_NUMBER` remains the primary backend config for transfers; if it is blank, the backend now falls back to `KAYA_RECEPTION_NUMBER`, then to the production reception default so live Retell responses do not return an empty `reception_number`
- `GET /healthz` is the lightweight health check for Railway or any other load balancer
- Weekly hours are persisted in `operating_hours`
- Availability logic lives in [src/services/availabilityService.js](/Users/basimhussain/Downloads/kaya reservation system/restaurant-table-reservation-system/back-end/src/services/availabilityService.js:1)
- Retell boundary normalization lives in [src/services/retellAdapterService.js](/Users/basimhussain/Downloads/kaya reservation system/restaurant-table-reservation-system/back-end/src/services/retellAdapterService.js:1)
- The Retell adapter resolves spoken times conservatively, supports bounded Urdu and Devanagari daypart cues such as `شام`, `صبح`, `رات`, `दोपहर`, and `शाम`, supports mixed-script date inputs such as `پندرہ April`, `پندرہ اپریل`, `पंद्रह April`, and `15 अप्रैल`, auto-resolves ambiguous `7 baje`-style inputs when only one candidate fits opening hours, shapes customer-facing messages in Urdu-first receptionist wording, and preserves resolved time state across later turns

## Railway deployment notes

The backend folder is deployable on Railway as the public service. The checked deployment assumptions are:

- builder: Nixpacks via [railway.json](/Users/basimhussain/Downloads/kaya reservation system/restaurant-table-reservation-system/back-end/railway.json:1)
- start command: `npm run start:prod`
- `start:prod` runs migrations, seeds baseline operating hours and tables idempotently, then starts Express
- health check path: `/healthz`

Required Railway environment variables:

- `PORT`
- `DB_DIALECT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `RESTAURANT_NAME`
- `RESTAURANT_TIMEZONE`
- `RECEPTION_NUMBER` or `KAYA_RECEPTION_NUMBER`

Recommended:

- `DEFAULT_RESERVATION_DURATION_MINUTES`
- `ALTERNATIVE_SLOT_STEP_MINUTES`
- `ALTERNATIVE_SEARCH_WINDOW_MINUTES`
- `DEFAULT_PHONE_COUNTRY`
- `SEATING_AREAS`

For a blank Railway database, the safe bootstrap path is:

```bash
npm run migrate:up
npm run seed:baseline
```

Those two commands are already built into `npm run start:prod`, so a fresh deployment can self-bootstrap without a separate manual seed step.

See the root README for full setup and API examples.
