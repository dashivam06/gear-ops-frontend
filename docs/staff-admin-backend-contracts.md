# Backend contracts (marking scheme)

This document describes JSON shapes the frontend expects or needs from the API for **admin**, **staff**, and **automation** features aligned with the coursework spec. Paths are relative to your API base (for example `http://localhost:7777`).

---

## 1. Staff customer insights report

**Purpose:** Staff “Reports → Customer insights” — top spenders, regular customers, overdue or pending credits.

**Suggested route:** `GET /api/v1/staff/customers/reports`  
**Auth:** Staff JWT.

**Envelope:** Same as other routes: `{ success, data, ... }` where `data` is the object below.

**Recommended `data` shape (camelCase):**

```json
{
  "topSpenders": [
    {
      "userId": 12,
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "totalSpend": 12450.5,
      "totalPurchases": 18
    }
  ],
  "regularCustomers": [
    {
      "userId": 34,
      "fullName": "John Smith",
      "email": "john@example.com",
      "phone": "+15559876543",
      "visitCount": 12,
      "totalPurchases": 9,
      "lastActivity": "2026-04-01T10:00:00Z"
    }
  ],
  "overdueCredits": [
    {
      "userId": 56,
      "fullName": "ACME Fleet",
      "email": "billing@acme.com",
      "phone": "+15550001111",
      "creditsRemaining": 320.0,
      "daysOverdue": 45
    }
  ]
}
```

**Frontend normalization:** `lib/api.ts` maps several alternate key names (for example `highSpenders`, `pendingCredits`, `balanceDue`, `customerId`) into the three arrays above. If your backend uses different names, either align with this document or extend `normalizeStaffCustomerInsights` in `lib/api.ts`.

---

## 2. Staff sales invoice — loyalty discount

**Rule:** When line **subtotal** (before tax, before discounts) for a single invoice is **greater than $5,000**, apply **10%** loyalty discount to that subtotal.

**Behavior:** The staff UI adds this amount to `discountAmount` sent on create/update so the stored invoice matches what the customer pays.

**Suggested fields on create invoice body:** `discountAmount` = loyalty portion + optional manual additional discount (both in dollars).

**Backend:** Should validate `subTotal`, `discountAmount`, and `finalAmount` for consistency and persist `discountAmount` on the invoice for history and reporting.

---

## 3. Automation — low stock (admin notification)

**Requirement:** When any part’s stock quantity falls **below 10 units**, the system should **notify the admin** (not only show a report in the UI).

**Frontend today:** Admin **Alerts** (`/admin/alerts`) shows a configurable low-stock list (default threshold 10), using the same low-stock report data the dashboard preview uses.

**Backend / ops (needed for full marks):**

- Option A: On each stock-changing operation (sale, purchase receipt, adjustment), if `stockQuantity < threshold`, enqueue an **email** or **in-app notification** to admin users, or append to an `admin_notifications` table consumed by a future `GET /api/v1/admin/notifications` endpoint.
- Option B: Scheduled job scans inventory hourly and sends digests.

**Suggested optional API for a future admin banner:**  
`GET /api/v1/admin/alerts/low-stock?threshold=10` returning `{ items: [{ partId, partName, stockQuantity, ... }] }` — not required if email-only.

---

## 4. Automation — overdue credit emails (customers)

**Requirement:** Email customers with **unpaid credit balances overdue by more than one month**.

**Frontend today:** Staff customer insights can list `overdueCredits` if the API provides `daysOverdue` / balances.

**Backend / ops (needed):**

- Nightly job: find open credit invoices or account balances where `oldestDueDate < today - 30 days` and `balance > 0`, send templated email, log sends to avoid duplicates (e.g. one reminder per 7 days).

**Suggested data for reporting (optional):** extend customer insights or invoices list with `creditBalance`, `oldestDueDate`, `daysOverdue`.

---

## 5. Staff invoice email

**Purpose:** Staff sends invoice PDF or link to customer email.

**Suggested route:** `POST /api/v1/staff/invoices/{salesInvoiceId}/send-email`  
**Body:** `{ "toEmail"?: "optional override" }`  
**Response:** `{ "sent": true, "messageId"?: "..." }`

The UI should call this after invoice creation or from a “Send email” action; wire the button to this route when the backend implements it.

---

## 6. Admin profile / settings (optional split)

If admin users must not use customer profile endpoints, provide:

- `GET /api/v1/admin/profile`
- `PUT /api/v1/admin/profile`

with the same field subset as staff profile (name, phone, image URL) as needed for `app/admin/settings/page.tsx`.
