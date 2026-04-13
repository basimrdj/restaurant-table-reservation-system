# Kaya Reservation System

Kaya Reservation System is a production-minded restaurant reservation platform built on the existing Vue + Express + Sequelize + MySQL repo. It is now the single source of truth for:

- customers identified by normalized phone number
- tables and seating areas
- reservations and status lifecycle
- weekly opening hours
- blocked slots / closures
- staff-facing reservation operations
- Retell-ready reservation APIs

## Stack

- Frontend: Vue 3 + Vite
- Backend: Node.js + Express
- Database: MySQL with Sequelize
- Tests: Jest + Supertest on backend, Vitest on frontend

## Kaya features

- Customer memory keyed by E.164-style phone numbers
- Seating areas: `indoor`, `indoor_rooftop`, `outdoor_rooftop`
- Weekly opening hours model plus date-specific closures
- Availability engine with:
  - smallest suitable table selection
  - overlap prevention
  - inactive table filtering
  - closure-aware checks
  - nearby alternative time suggestions
  - alternative area suggestions
- Reservation lifecycle statuses:
  - `confirmed`
  - `cancelled`
  - `completed`
  - `no_show`
- Retell-facing endpoints for lookup, availability, create, modify, and cancel
- Staff dashboard for reservations, customers, tables, closures, and hours

## Setup

### 1. Install dependencies

Run installs in all three package locations:

```bash
cd restaurant-table-reservation-system
npm install

cd back-end
npm install

cd ../front-end
npm install
```

### 2. Configure environment variables

Copy [`back-end/.env.example`](/Users/basimhussain/Downloads/kaya reservation system/restaurant-table-reservation-system/back-end/.env.example:1) to `back-end/.env` and adjust values for your environment.

Important settings:

- `RESTAURANT_TIMEZONE`: defaults to `Asia/Karachi`
- `DEFAULT_RESERVATION_DURATION_MINUTES`: defaults to `120`
- `ALTERNATIVE_SLOT_STEP_MINUTES`: defaults to `30`
- `DEFAULT_PHONE_COUNTRY`: defaults to `92`
- `SEATING_AREAS`: defaults to `indoor,indoor_rooftop,outdoor_rooftop`
- `RECEPTION_NUMBER`: optional, returned by lookup-customer for Retell variable injection

### 3. Create the database

Create the MySQL databases referenced by `DB_NAME` and `DB_NAME_TEST`.

### 4. Reset migrations

This Kaya refactor assumes a fresh schema reset.

```bash
cd back-end
npm run migrate:reset
```

### 5. Optional sample seed

Seed a starter Kaya table inventory:

```bash
cd back-end
npm run seed:all
```

The migrations already create default weekly opening hours for all 7 days. The sample seeder adds starter tables across the three Kaya seating areas.

### 6. Run the app

From the project root:

```bash
npm run start:dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/v1`

## Main admin routes

- `/` dashboard
- `/reservations`
- `/customers`
- `/tables`
- `/closures`
- `/settings`

## Data model

### Customer

- `id`
- `name`
- `phone_e164` unique
- `preferred_language`
- `notes`
- `vip_flag`
- `last_visit_at`
- timestamps

### Table

- `id`
- `table_name`
- `area`
- `capacity`
- `is_active`
- `notes`
- timestamps

### Reservation

- `id`
- `customer_id`
- `reservation_date`
- `start_time`
- `end_time`
- `guest_count`
- `table_id`
- `seating_area`
- `status`
- `source`
- `special_request`
- `idempotency_key`
- timestamps

### Closure

- `id`
- `date`
- `start_time`
- `end_time`
- `area` nullable
- `table_id` nullable
- `reason`
- timestamps

### Operating hour

- `day_of_week`
- `open_time`
- `close_time`
- `is_closed`

## Availability logic

The availability engine lives in the backend service layer and is not buried inside route handlers.

Availability evaluation order:

1. Validate the request.
2. Normalize date/time input.
3. Apply default duration if one is not provided.
4. Check the weekly operating hours for the requested weekday.
5. Reject requests outside opening hours.
6. Load active tables that can fit the party size.
7. Exclude tables blocked by overlapping confirmed reservations.
8. Exclude tables blocked by whole-restaurant, area-level, or table-level closures.
9. Pick the smallest suitable remaining table.
10. If unavailable, return alternative areas and nearby time slots.

Concurrency protections:

- idempotency key reuse returns the original reservation
- fallback duplicate guard treats `same customer + same date + same start time + same guest_count + confirmed status` as the same booking regardless of source
- create/modify paths run availability inside a DB transaction and lock candidate table rows before writing

## Retell-ready endpoints

Base path: `/api/retell`

### `POST /lookup-customer`

Request:

```json
{
  "phone_number": "03001234567"
}
```

Response:

```json
{
  "success": true,
  "customer_id": 12,
  "customer_name": "Ayesha Khan",
  "is_returning_customer": true,
  "preferred_language": "en",
  "last_seating_area": "indoor_rooftop",
  "last_party_size": 4,
  "last_visit_summary": "Booked indoor_rooftop for 4 guests on the last completed visit.",
  "reception_number": "+922112345678"
}
```

### `POST /check-availability`

Request:

```json
{
  "reservation_date": "2026-04-20",
  "reservation_time": "19:30",
  "guest_count": 4,
  "seating_preference": "indoor_rooftop"
}
```

Response:

```json
{
  "success": true,
  "available": true,
  "matched_area": "indoor_rooftop",
  "matched_table_id": 7,
  "alternative_slots": [],
  "alternative_areas": [],
  "explanation": "A suitable Kaya table is available."
}
```

### `POST /create-reservation`

Request:

```json
{
  "customer_name": "Ayesha Khan",
  "phone_number": "03001234567",
  "reservation_date": "2026-04-20",
  "reservation_time": "19:30",
  "guest_count": 4,
  "seating_preference": "indoor_rooftop",
  "special_request": "Window seat if possible",
  "source": "phone_agent",
  "idempotency_key": "retell-call-42"
}
```

Response:

```json
{
  "success": true,
  "reservation_id": 34,
  "confirmation_summary": "Reservation created for Ayesha Khan on 2026-04-20 at 19:30:00.",
  "assigned_table": "IR2",
  "assigned_area": "indoor_rooftop"
}
```

### `POST /modify-reservation`

Modify the existing reservation by `reservation_id` and the updated booking fields.

### `POST /cancel-reservation`

Request:

```json
{
  "reservation_id": 34
}
```

Response:

```json
{
  "success": true,
  "reservation_id": 34,
  "status": "cancelled",
  "confirmation_summary": "Reservation 34 has been cancelled."
}
```

## Testing

Backend:

```bash
cd back-end
npm test
```

Frontend:

```bash
cd front-end
npm run test:unit
npm run build
```

Current automated coverage includes:

- customer lookup by normalized phone
- duplicate-customer prevention
- overlapping reservation blocking
- closure-aware availability
- smallest suitable table selection
- successful reservation creation
- idempotency key reuse
- fallback duplicate submission guard
- cancellation freeing availability
- returning-customer summary behavior
- Retell response shape checks
