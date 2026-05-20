# Backend API — Appointments, Service Records & Billing

Handoff for aligning the **GearOps** API with the current customer + staff portal.  
Scope: **appointments**, **service records**, **sales invoices**, and **customer balance** behaviour.

Unless noted, responses should use the existing **envelope** shape (`success`, `data`, …) and **camelCase** JSON property names (the client normalizes some PascalCase reads defensively).

---

## 1. Customer — appointments

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/staff/appointments/available-slots?date=yyyy-MM-dd` | **Public** slot grid for booking UI. |
| `GET` | `/api/v1/customers/appointments` | List customer’s appointments. |
| `GET` | `/api/v1/customers/appointments/upcoming` | Subset of upcoming (optional but used if wired). |
| `POST` | `/api/v1/customers/appointments` | Create booking. |
| `PUT` | `/api/v1/customers/appointments/{id}` | **Reschedule** (client sends new requested datetime). |
| `DELETE` | `/api/v1/customers/appointments/{id}` | **Cancel** (customer-initiated). |

### 1.1 `POST /api/v1/customers/appointments` — request body (client)

```json
{
  "vehicleId": 1,
  "requestedDate": "2026-05-15T10:00:00.000Z",
  "remarks": "optional customer notes"
}
```

**Confirm / implement:** Field names must match (`requestedDate`, `remarks`) or document the canonical names and the client will be updated.

### 1.2 `PUT /api/v1/customers/appointments/{id}` — reschedule (client)

```json
{
  "requestedDate": "2026-05-20T14:00:00.000Z"
}
```

**Needed from API:** Clear rules when reschedule is allowed (e.g. only `Pending` / `Confirmed`), and whether status resets to `Pending` for staff re-approval (recommended to match staff reschedule behaviour).

### 1.3 `GET …/available-slots` — response (client expectation)

- `date` (string, `yyyy-MM-dd`)
- `timeSlots[]`: `slotNumber`, `displayTime`, `startTime`, `endTime`, `isBooked`, `isBreak`
- Optional: `totalAvailableSlots`, `totalBookedSlots`

**Needed:** Stable contract; anonymous access is assumed (no `Authorization` header).

### 1.4 List/detail appointment DTO (customer + staff)

Each appointment should expose at minimum:

- `appointmentId`, `vehicleId`, `vehicleNumber`
- `appointmentDate` or `requestedDate` (client maps both)
- `description` or `remarks`
- `status` (string; see §4)

**Optional but valuable:** `customerId`, `customerEmail` on staff views for invoicing and comms.

---

## 2. Staff — schedule & decisions

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/staff/schedule/today` | Today’s rows. |
| `GET` | `/api/v1/staff/schedule/upcoming` | Future rows. |
| `GET` | `/api/v1/staff/schedule/all` | All rows (filters client-side today). |
| `GET` | `/api/v1/staff/schedule/{appointmentId}` | Detail drawer. |
| `GET` | `/api/v1/staff/schedule/summary` | Dashboard tiles (shape may vary; client reads several aliases). |
| `POST` | `/api/v1/staff/appointments/{id}/approve` | Body: `{ "decision": "Approved", "notes": "optional" }` |
| `POST` | `/api/v1/staff/appointments/{id}/reject` | Body: `{ "decision": "Rejected", "notes": "required" }` |
| `POST` | `/api/v1/staff/appointments/{id}/complete` | Empty body. |
| `POST` | `/api/v1/staff/appointments/{id}/no-show` | Body: `{ "notes": "optional" }` |
| `POST` | `/api/v1/staff/appointments/{id}/reschedule` | Body: `{ "newDate": "ISO-8601" }` |

**Needed from API:**

- Document **valid status transitions** (machine-readable error on illegal transition).
- Confirm **email** is sent on approve / reject / reschedule / complete / no-show (subjects + idempotency if retried).
- **Staff reschedule:** confirm status returns to `Pending` if product requires re-approval after `newDate`.

---

## 3. Service records

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/staff/service-records` | List (used to attach labor to invoices by `appointmentId`). |
| `GET` | `/api/v1/staff/service-records/{id}` | Detail. |
| `GET` | `/api/v1/staff/service-records/monthly/{year}/{month}` | Monthly list. |
| `POST` | `/api/v1/staff/service-records` | Create. |

### 3.1 `POST` body (client)

```json
{
  "appointmentId": 7,
  "serviceDescription": "text",
  "serviceCost": 0
}
```

**Clarify with product:**

- Whether **`serviceCost` is allowed to be `0`** at create and updated later, or must be set when work is finished.
- Whether **`customerId`** should appear on list/detail DTOs for safer joins than name matching.

---

## 4. Appointment status enum (contract)

Client handles at least:

`Pending`, `Confirmed`, `In Progress`, `Completed`, `Cancelled`, `NoShow` (and tolerates casing variants if needed).

**Needed:** Single canonical list + which roles may set which transition.

---

## 5. Staff — sales invoices & balance

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/staff/sales-invoices?page=&pageSize=` | Paginated list. |
| `GET` | `/api/v1/staff/sales-invoices/{id}` | Detail + line items. |
| `POST` | `/api/v1/staff/sales-invoices` | Create invoice. |
| `PATCH` | `/api/v1/staff/sales-invoices/{id}/pay` | Mark paid (and any balance side-effects). |
| `POST` | `/api/v1/staff/sales-invoices/{id}/email` | Email PDF/link. |

### 5.1 `POST /api/v1/staff/sales-invoices` — core body (today)

```json
{
  "customerId": 10,
  "vehicleId": 3,
  "isPaid": false,
  "dueDate": "2026-05-20T00:00:00.000Z",
  "items": [
    { "partId": 1, "quantity": 2, "pricePerUnit": 20.0 }
  ]
}
```

### 5.2 Optional / extended fields (client sends when supported)

```json
{
  "discountAmount": 10.0,
  "appointmentId": 7,
  "invoiceType": "Appointment"
}
```

`invoiceType` values used by client: **`Parts`** | **`Appointment`** (omit or null for legacy parts-only).

**Backend should define and document:**

1. **`discountAmount`** — applied to subtotal; reflected in `subTotal` / `finalAmount` on response.
2. **`appointmentId`** — link invoice to a visit for reporting and customer history.
3. **`invoiceType`** — persisted and returned on list/detail (`invoiceType` on `SalesInvoice`).
4. **Stock** — decremented on line items when invoice is created or when marked paid (pick one rule and document).
5. **Customer balance / credit (`creditsRemaining` or ledger)**  
   - On **unpaid** invoice: increase amount owed **or** draw from prepaid credit per product rules.  
   - On **`PATCH …/pay`**: settle against balance/payment.  
   The client only shows current balance and credit ceiling; **authoritative balance logic must live in the API.**

### 5.3 Line items

- Each line: `partId`, `quantity`, `pricePerUnit` (client may override unit price vs catalog for labor one-offs).
- **Labour:** if there is no first-class “labour line” type, document a **catalog part** (e.g. “Shop labour”) as the supported approach, or add **`lineType`** + `description` + `amount` in a v2 DTO.

### 5.4 Invoice list/detail response (recommended)

Include on list and detail where applicable:

- `salesInvoiceId`, `customerId`, `customerName`, `vehicleId`, `vehicleNumber`
- `invoiceDate`, `dueDate`, `isPaid`
- `subTotal`, `discountAmount`, `finalAmount`
- `items[]` with `partId`, `partName`, `quantity`, `pricePerUnit`, `totalPrice`
- **`appointmentId`** (nullable), **`invoiceType`** (nullable or enum)

---

## 6. Staff — customers (invoicing context)

| Method | Path |
|--------|------|
| `GET` | `/api/v1/staff/customers?page=&pageSize=` |
| `GET` | `/api/v1/staff/customers/{id}` |
| `GET` | `/api/v1/staff/customers/search?q=` |

**DTO:** include `userId`, `fullName`, `email`, `phone`, **`creditsRemaining`**, **`profileImageUrl`**, `vehicles[]` with `vehicleId`, `vehicleNumber`, `brand`, `model`, `year`.

---

## 7. Checklist — “missing or confirm”

Use this as a sign-off list with the backend team.

- [ ] **Customer book:** `POST` body field names (`requestedDate` / `remarks`) frozen in OpenAPI.
- [ ] **Customer reschedule:** `PUT` allowed statuses + response DTO + email.
- [ ] **Public slots:** `GET available-slots` contract + rate limits if needed.
- [ ] **Staff decisions:** approve/reject/complete/no-show/reschedule bodies and status machine documented.
- [ ] **Service record:** `serviceCost` lifecycle (0 vs final); optional link to parts used (if product wants it).
- [ ] **Invoice create:** accept and persist `discountAmount`, `appointmentId`, `invoiceType`; return them on GET.
- [ ] **Invoice + balance:** exact rules for unpaid vs paid and interaction with `creditsRemaining` / ledger.
- [ ] **Invoice + stock:** when inventory decrements.
- [ ] **Optional v2:** first-class labour line or `GET …/appointments/{id}/suggested-invoice-lines` to return parts + labour from completed work.

---

## 8. Out of scope here

Auth (`/api/v1/auth/*`), customer purchases PDF, part-requests, and admin modules are separate; only list them if the same release owns them.

---

*Generated from the current `gearops-frontend` client (`lib/api.ts` + staff/customer appointment & invoice screens). Update this file when routes or DTOs change.*
