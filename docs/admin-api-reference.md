# Admin API Reference (GearOps)

Frontend-facing reference aligned with the **GearOps** admin backend. All `/api/v1/admin/*` routes require **Admin** authorization (`403` for Customer/Staff tokens).

Responses use the standard envelope:

```json
{
  "timestamp": "2026-05-13T10:30:45Z",
  "status": 200,
  "success": true,
  "message": "Request completed successfully",
  "path": "/api/v1/admin/...",
  "method": "GET",
  "data": {}
}
```

Paged lists return `data: { items, page, pageSize, totalItems, totalPages }` (and `hasNextPage` / `hasPreviousPage` when the API provides them).

---

## Non-negotiable product capabilities (admin)

These are **required** in the admin console; the frontend implements them against the routes below.

| Capability | Frontend route | Primary APIs |
|------------|----------------|--------------|
| Financial reports (daily, monthly, yearly) | `/admin/reports` | `GET .../reports/financial` |
| Financial report (custom inclusive range + PDF) | `/admin/reports` | `GET .../financial/range`, `POST .../financial/range/pdf` |
| Inventory snapshot | `/admin/reports` | `GET /api/v1/admin/reports/inventory` |
| Low-stock alerts (threshold) | `/admin/alerts` | `GET /api/v1/admin/reports/low-stock?threshold=` |
| Staff registration & lifecycle (incl. active flag) | `/admin/staff` | `POST/PUT/DELETE .../staff`, `PATCH .../staff/{id}/status` |
| Parts CRUD | `/admin/inventory` | `POST/PUT/DELETE .../parts`, list/search/category |
| Vendor CRUD | `/admin/vendors` | `POST/PUT/DELETE .../vendors`, paged list |
| Purchase orders (workflow; stock on **Delivered** only) | `/admin/invoices` | `POST/PUT .../purchase-orders`, `POST .../{id}/send-to-vendor`, `POST .../{id}/confirm`, `POST .../{id}/deliver`, list/detail |

**Note:** Customer **sales** invoices live under **Staff** (`/api/v1/staff/sales-invoices`), not admin. Admin “invoices” in the UI are **purchase orders** only. Inventory increases when a PO is marked **Delivered**, not on create.

### Purchase order workflow (status)

| `statusText` | Meaning |
|--------------|---------|
| `Draft` | Created; editable; no stock change |
| `SentToVendor` | Email sent; editable; no stock |
| `ConfirmedByVendor` | Invoice # saved; editable; no stock |
| `Delivered` | Received; stock added; **not editable** |
| `Cancelled` | Reserved |

Response fields used by the UI: `statusText`, `isEditable`, `logs`, `sentToVendorAt`, `confirmedAt`, `deliveredAt`, nullable `invoiceNumber`.

## Shared DTOs (response shapes)

### Staff

```json
{
  "staffId": 1,
  "fullName": "John Doe",
  "email": "john.doe@gearops.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "position": "Mechanic",
  "profileImageUrl": null,
  "joinDate": "2026-01-15T10:30:45Z",
  "isActive": true,
  "createdAt": "2026-01-15T10:30:45Z"
}
```

### Vendor

```json
{
  "vendorId": 1,
  "vendorName": "Parts & Motors Inc",
  "contactPerson": "Jane Smith",
  "phone": "+1987654321",
  "email": "contact@partsmotors.com",
  "address": "456 Auto Blvd",
  "imageUrl": null,
  "createdAt": "2026-01-15T10:30:45Z"
}
```

### Part

```json
{
  "partId": 1,
  "vendorId": 1,
  "partName": "Brake Pads",
  "description": "Ceramic brake pads",
  "category": "Brakes",
  "stockQuantity": 18,
  "unit": "pcs",
  "costPricePerUnit": 1200.0,
  "sellingPricePerUnit": 1500.0,
  "imageUrl": null,
  "createdAt": "2026-01-15T10:30:45Z",
  "vendorName": "Parts & Motors Inc"
}
```

### Purchase order

```json
{
  "purchaseOrderId": 1,
  "vendorId": 1,
  "vendorName": "Parts & Motors Inc",
  "orderDate": "2026-05-10T10:30:45Z",
  "invoiceNumber": "INV-2026-001",
  "totalAmount": 12000.0,
  "items": [
    {
      "partId": 1,
      "partName": "Brake Pads",
      "quantity": 10,
      "unitPrice": 1200.0,
      "totalPrice": 12000.0
    }
  ]
}
```

### Financial report

```json
{
  "reportDate": "2026-05-13T10:30:45Z",
  "period": "Daily",
  "totalSalesRevenue": 5000.0,
  "totalPurchaseCost": 2000.0,
  "grossProfit": 3000.0,
  "profitMargin": 60.0,
  "totalTransactions": 15,
  "totalPartsMovement": 45,
  "totalRevenue": 5000.0,
  "totalExpenses": 2000.0,
  "netProfit": 3000.0
}
```

`profitMargin` is a **percentage** (e.g. `60.0` = 60%). The frontend also tolerates either `totalRevenue` / `totalSalesRevenue` and `totalExpenses` / `totalPurchaseCost` for compatibility.

---

## Staff — `/api/v1/admin/staff`

| Method | Path | Body / notes |
|--------|------|----------------|
| `POST` | `/api/v1/admin/staff` | Create: `fullName`, `email`, `phone`, `address`, `position`, `profileImageUrl` |
| `PUT` | `/api/v1/admin/staff/{staffId}` | Update; include `isActive` when editing profile |
| `GET` | `/api/v1/admin/staff/{staffId}` | By id (client helper: `getAdminStaffById`) |
| `GET` | `/api/v1/admin/staff?page=&pageSize=` | Paged list |
| `PATCH` | `/api/v1/admin/staff/{staffId}/status` | `{ "isActive": false }` |
| `DELETE` | `/api/v1/admin/staff/{staffId}` | Delete |

---

## Vendors — `/api/v1/admin/vendors`

| Method | Path |
|--------|------|
| `POST` | `/api/v1/admin/vendors` |
| `PUT` | `/api/v1/admin/vendors/{vendorId}` |
| `GET` | `/api/v1/admin/vendors/{vendorId}` |
| `GET` | `/api/v1/admin/vendors?page=&pageSize=` |
| `DELETE` | `/api/v1/admin/vendors/{vendorId}` |
| `GET` | `/api/v1/admin/vendors/{vendorId}/parts` |
| `GET` | `/api/v1/admin/vendors/{vendorId}/purchase-orders` |

---

## Parts — `/api/v1/admin/parts`

| Method | Path |
|--------|------|
| `POST` | `/api/v1/admin/parts` |
| `PUT` | `/api/v1/admin/parts/{partId}` |
| `GET` | `/api/v1/admin/parts/{partId}` |
| `GET` | `/api/v1/admin/parts?page=&pageSize=` |
| `GET` | `/api/v1/admin/parts/category/{category}?page=&pageSize=` |
| `GET` | `/api/v1/admin/parts/search?q=&page=&pageSize=` |
| `DELETE` | `/api/v1/admin/parts/{partId}` |

---

## Purchase orders — `/api/v1/admin/purchase-orders`

| Method | Path |
|--------|------|
| `POST` | `/api/v1/admin/purchase-orders` — body: `vendorId`, `invoiceNumber`, `items[]` with `partId`, `quantity`, `unitPrice` |
| `GET` | `/api/v1/admin/purchase-orders/{purchaseOrderId}` |
| `GET` | `/api/v1/admin/purchase-orders?page=&pageSize=` |

---

## Reports — `/api/v1/admin/reports`

| Method | Path | Query |
|--------|------|--------|
| `GET` | `/api/v1/admin/reports/financial` | `period=Daily|Monthly|Yearly`, optional `year`, `month`, or **`date=YYYY-MM-DD`** (single day) |
| `GET` | `/api/v1/admin/reports/financial/range` | **`startDate`**, **`endDate`** (inclusive `YYYY-MM-DD`) |
| `POST` | `/api/v1/admin/reports/financial/range/pdf` | same query params; response includes a Cloudinary **PDF URL** (frontend: `postFinancialReportRangePdf`) |
| `GET` | `/api/v1/admin/reports/inventory` | — |
| `GET` | `/api/v1/admin/reports/low-stock` | `threshold` (default 10); surfaced on **`/admin/alerts`** |

---

*This document is the contract the **gearops-frontend** admin area is built against (`lib/api.ts`, `app/admin/*`). Update when the backend changes.*
