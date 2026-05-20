# Admin Portal Specification & API Documentation

This document describes what the **Admin console** should contain, how each page should behave, what data should be shown, and the corresponding API endpoints needed for integration.

It is based on the existing frontend routes under `app/admin/*` and the API calls currently defined in `lib/api.ts`.

## Role Definition
- **Standard Authentication**: All admin APIs must require `Authorization: Bearer <JWT_TOKEN>`.
- **Admin is a User with `role: "Admin"`** (not a separate entity).
- **Dates**: handled in UTC, returned as ISO8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **UI must always make role obvious** (“Admin Console”).
- **Pagination standard**: list endpoints accept `?page=1&pageSize=20` and return a `PaginatedResponse<T>`.

### Standard Envelope (what frontend expects)
The frontend API client expects the backend response envelope:

```json
{
  "timestamp": "2026-05-11T12:00:00.000Z",
  "status": 200,
  "success": true,
  "message": "OK",
  "path": "/api/v1/admin/vendors",
  "method": "GET",
  "data": { }
}
```

### Standard Pagination DTO

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

### Global UI Rules (Admin)
- **Loading / empty / error states** must be clear.
- **Fallbacks**: if a property is missing, display `—` or `Not provided`.
- **Money**: show currency and 2 decimals.
- **Status**: show badges/pills.
- **“Ask everything” detail**: when admin clicks View/Edit on a record, show all relevant fields for that record and its relationships.

---

## Navigation Structure & Routes
Admin sidebar currently contains:
- Overview → `/admin`
- Reports → `#` (placeholder in UI; see “Missing Modules” below)
- Inventory → `/admin/inventory`
- Vendors → `/admin/vendors`
- Invoices → `/admin/invoices`
- Staff → `/admin/staff`
- Tasks → `/admin/tasks`
- Alerts → `#` (placeholder in UI; see “Missing Modules” below)
- Settings → `/admin/settings`

---

## 1) Admin Dashboard (Overview)
**Path:** `/admin`

### What this page must show
KPI cards:
- Total revenue (monthly report)
- Net profit (monthly report)
- Inventory value (computed from parts list: `sum(costPricePerUnit * stockQuantity)`)
- Active staff count

Panels:
- Low stock alerts list (scrollable)
- Quick summary card:
  - total parts
  - total vendors
  - total staff
  - total expenses
  - low stock item count

### Endpoints needed
#### Financial report
- **`GET /api/v1/admin/reports/financial?period=Daily|Monthly|Yearly&year=YYYY&month=MM`**
- **Used by UI**: `period=Monthly` (year/month optional)
- **Returns** (minimum):

```json
{
  "totalRevenue": 0,
  "totalExpenses": 0,
  "netProfit": 0
}
```

#### Inventory report (for dashboard report widgets; can be extended)
- **`GET /api/v1/admin/reports/inventory`**
- **Returns**: array (shape can be flexible), used for “inventory report” presence.

#### Low stock parts
- **`GET /api/v1/admin/reports/low-stock?threshold=10`**
- **Returns** (minimum per item):

```json
{
  "partId": 1,
  "partName": "Oil Filter",
  "category": "Filters",
  "stockQuantity": 3,
  "unit": "Piece"
}
```

#### Staff list (for count)
- **`GET /api/v1/admin/staff?page=1&pageSize=20`**

#### Parts list (for inventory value and count)
- **`GET /api/v1/admin/parts?page=1&pageSize=20`**

#### Vendors list (for vendor count)
- **`GET /api/v1/admin/vendors?page=1&pageSize=20`**

---

## 2) Inventory (Parts Management)
**Path:** `/admin/inventory`

### What this page must show
Top actions:
- “Add Part” dialog (full form)

Search:
- Search by part name or category

Parts table columns:
- Part (image, name, category)
- Vendor name
- Stock (quantity + unit, low stock badge when `stockQuantity < 10`)
- Pricing (selling price + cost price)
- Actions: edit, delete

Dialogs:
- Add Part (with image upload URL)
- Edit Part (prefilled values)
- Delete confirmation

### Endpoints needed
#### List parts (paginated)
- **`GET /api/v1/admin/parts?page=1&pageSize=20`**
- Returns: `PaginatedResponse<PartDto>`

`PartDto` (minimum expected by UI):

```json
{
  "partId": 1,
  "vendorId": 10,
  "vendorName": "Vendor name (optional)",
  "partName": "Brake Pad",
  "description": "text",
  "category": "Brakes",
  "stockQuantity": 15,
  "unit": "Set",
  "costPricePerUnit": 50.0,
  "sellingPricePerUnit": 75.0,
  "imageUrl": "https://...",
  "createdAt": "2026-05-11T12:00:00.000Z"
}
```

#### Create part
- **`POST /api/v1/admin/parts`**
- Body (minimum):

```json
{
  "vendorId": 10,
  "partName": "Brake Pad",
  "description": "text",
  "category": "Brakes",
  "stockQuantity": 15,
  "unit": "Set",
  "costPricePerUnit": 50.0,
  "sellingPricePerUnit": 75.0,
  "imageUrl": "https://..."
}
```

#### Update part
- **`PUT /api/v1/admin/parts/{partId}`**
- Body: partial or full part update (frontend sends partial fields).

#### Delete part
- **`DELETE /api/v1/admin/parts/{partId}`**

#### List vendors (for Part form dropdown)
- **`GET /api/v1/admin/vendors?page=1&pageSize=20`**

---

## 3) Vendors Management
**Path:** `/admin/vendors`

### What this page must show
Top actions:
- “Add Vendor” dialog (full form)

Search:
- Search by vendor name, contact person, or email

Table columns:
- Vendor (image, name, address)
- Contact person
- Contact details (email + phone)
- Actions: edit, delete

Dialogs:
- Add Vendor (image URL)
- Edit Vendor (prefilled values)
- Delete confirmation

### Endpoints needed
#### List vendors (paginated)
- **`GET /api/v1/admin/vendors?page=1&pageSize=20`**
- Returns: `PaginatedResponse<VendorDto>`

`VendorDto` (minimum expected):

```json
{
  "vendorId": 10,
  "vendorName": "Supplier A",
  "contactPerson": "John Doe",
  "phone": "+977-...",
  "email": "vendor@example.com",
  "address": "Kathmandu",
  "imageUrl": "https://...",
  "createdAt": "2026-05-11T12:00:00.000Z"
}
```

#### Create vendor
- **`POST /api/v1/admin/vendors`**

#### Update vendor
- **`PUT /api/v1/admin/vendors/{vendorId}`**

#### Delete vendor
- **`DELETE /api/v1/admin/vendors/{vendorId}`**

---

## 4) Admin Invoices
**Path:** `/admin/invoices`

### Important note (current frontend behavior)
The current admin invoices page is implemented using **staff sales invoice endpoints**:
- `GET /api/v1/staff/sales-invoices`
- `POST /api/v1/staff/sales-invoices`
- `PATCH /api/v1/staff/sales-invoices/{invoiceId}/pay`
- `POST /api/v1/staff/sales-invoices/{invoiceId}/email`

If you want strict separation, you should create **admin equivalents** and then update the frontend later. For now, backend must support the endpoints below exactly, or admin invoices page will not function.

### What this page must show
Top actions:
- “Create Invoice” dialog (customer, vehicle, parts items, discount)

Search:
- Search by invoice id or customer name

Table columns:
- Invoice ID
- Customer + vehicle number
- Invoice date
- Final amount
- Paid status
- Actions: mark paid (if unpaid), email

### Endpoints needed (as used today)
#### List invoices (paginated)
- **`GET /api/v1/staff/sales-invoices?page=1&pageSize=20`**
- Returns: `PaginatedResponse<SalesInvoiceDto>`

#### Create invoice
- **`POST /api/v1/staff/sales-invoices`**
- Body:

```json
{
  "customerId": 3,
  "vehicleId": 5,
  "isPaid": false,
  "dueDate": "2026-06-01T00:00:00.000Z",
  "items": [
    { "partId": 7, "quantity": 1, "pricePerUnit": 45.0 }
  ]
}
```

#### Mark invoice paid
- **`PATCH /api/v1/staff/sales-invoices/{invoiceId}/pay`**

#### Email invoice
- **`POST /api/v1/staff/sales-invoices/{invoiceId}/email`**

#### Supporting endpoints required for the create flow
- Customers list (staff-scoped, used for dropdown):
  - **`GET /api/v1/staff/customers?page=1&pageSize=20`**
- Parts list (admin):
  - **`GET /api/v1/admin/parts?page=1&pageSize=20`**

`SalesInvoiceDto` (minimum):

```json
{
  "salesInvoiceId": 123,
  "customerId": 3,
  "customerName": "Customer Name",
  "vehicleId": 5,
  "vehicleNumber": "BA-2-PA-1234",
  "invoiceDate": "2026-05-11T12:00:00.000Z",
  "subTotal": 100.0,
  "discountAmount": 0.0,
  "finalAmount": 100.0,
  "isPaid": false,
  "dueDate": "2026-06-01T00:00:00.000Z",
  "items": [
    { "partId": 7, "partName": "Oil Filter", "quantity": 1, "pricePerUnit": 45.0, "totalPrice": 45.0 }
  ]
}
```

---

## 5) Staff Management (Admin creates staff users)
**Path:** `/admin/staff`

### What this page must show
Top actions:
- Add staff (full form)

Search:
- Search by name, email, phone

Table columns:
- Name (image + full name)
- Contact (email + phone)
- Position
- Status (Active/Inactive)
- Actions: edit, delete

Dialogs:
- Add staff
- Edit staff (prefilled)
- Delete confirmation

### Endpoints needed
#### List staff (paginated)
- **`GET /api/v1/admin/staff?page=1&pageSize=20`**
- Returns: `PaginatedResponse<StaffMemberDto>`

`StaffMemberDto` (minimum):

```json
{
  "staffId": 20,
  "fullName": "Staff Name",
  "email": "staff@example.com",
  "phone": "+977-...",
  "address": "Kathmandu",
  "position": "Mechanic",
  "profileImageUrl": "https://...",
  "joinDate": "2026-01-01T00:00:00.000Z",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

#### Create staff
- **`POST /api/v1/admin/staff`**
- Body (minimum):

```json
{
  "fullName": "Staff Name",
  "email": "staff@example.com",
  "phone": "+977-...",
  "address": "Kathmandu",
  "position": "Mechanic",
  "profileImageUrl": "https://..."
}
```

#### Update staff
- **`PUT /api/v1/admin/staff/{staffId}`**

#### Delete staff
- **`DELETE /api/v1/admin/staff/{staffId}`**

#### Toggle staff active status (not used by current UI table, but exists in API)
- **`PATCH /api/v1/admin/staff/{staffId}/status`**
- Body:

```json
{ "isActive": true }
```

### Staff Authentication Architecture (backend requirement)
Admin creation must:
- create a **User** with `role: "Staff"` (and hashed password)
- create a **Staff record** (position/join date metadata)
- return staff DTO back to admin.

Staff login is standard:
- **`POST /api/v1/auth/login`**
- returns JWT with `role: "Staff"` claim.

---

## 6) Admin Tasks
**Path:** `/admin/tasks`

### What this page must show (current UI behavior)
Tabs:
- Appointments (list)
- Active Services (service record list)

Search:
- Search by customer or vehicle number

Appointment table:
- Customer
- Vehicle
- Date + description
- Status badge
- Action: “Start Service” → creates service record

Services table:
- Vehicle
- Customer
- Description
- Cost
- Status badge
- Action: “Complete” → updates service record status to Completed

### Endpoints needed (as used today)
This page uses staff endpoints:

#### Appointments list
- **`GET /api/v1/staff/schedule/all`**

#### Service records list
- **`GET /api/v1/staff/service-records`**

#### Start service (create service record; completes appointment workflow)
- **`POST /api/v1/staff/service-records`**
- Body:

```json
{ "appointmentId": 123, "serviceDescription": "Changed oil", "serviceCost": 150.0 }
```

#### Complete service record
- **`PUT /api/v1/staff/service-records/{serviceRecordId}`**
- Body:

```json
{ "status": "Completed" }
```

---

## 7) Admin Settings
**Path:** `/admin/settings`

### What this page must show (current UI behavior)
Profile & identity:
- Profile photo (upload)
- Full name (editable)
- Email (read-only)
- Email subscription toggle

Security:
- Change password form (current/new/confirm) with password strength display

Danger zone:
- Delete account (requires password confirmation)

### Endpoints needed (current implementation)
This page currently calls **customer profile endpoints**, not admin-specific:

#### Get profile
- **`GET /api/v1/customers/profile`**

#### Update profile
- **`PUT /api/v1/customers/profile`**
- Body (minimum):

```json
{
  "fullName": "Admin Name",
  "phone": "optional (if supported)",
  "address": "optional (if supported)",
  "profileImageUrl": "https://..."
}
```

#### Change password
- Not implemented in current backend API client (frontend stub uses reset flow). Recommended:
  - **`PUT /api/v1/auth/change-password`** (or similar)

#### Delete account
- Not implemented in current backend API client (frontend returns `{ success: true }`). Recommended:
  - **`DELETE /api/v1/users/me`** with password confirmation

> If you want Admin Settings to be fully correct, add admin profile endpoints:
> - `GET /api/v1/admin/profile`
> - `PUT /api/v1/admin/profile`
> and update frontend later. For now, backend must support `/api/v1/customers/profile` for this page to work as-is.

---

## Missing Modules (present in sidebar as placeholders)
The admin sidebar shows “Reports” and “Alerts” but they are currently `href: "#"` (not implemented as pages).

If you want to complete them cleanly, implement these endpoints and then add routes later:

### Admin Reports (recommended)
- Financial report already exists:
  - `GET /api/v1/admin/reports/financial?...`
- Add purchase/order reports if needed:
  - `GET /api/v1/admin/reports/purchase-orders?year=YYYY&month=MM`
- Add sales invoices summary:
  - `GET /api/v1/admin/reports/sales?year=YYYY&month=MM`

### Admin Alerts (recommended)
- Low stock already exists:
  - `GET /api/v1/admin/reports/low-stock?threshold=10`
- Add notification center:
  - `GET /api/v1/admin/notifications?page=1&pageSize=20`
  - `PATCH /api/v1/admin/notifications/{notificationId}/read`

---

## Completion Standard (Admin)
Admin portal is complete when:
- Every admin route in the sidebar is reachable and functional.
- Inventory and vendor CRUD is fully working.
- Staff creation/management works and creates proper `Role.Staff` users.
- Dashboard KPIs and low stock alerts render real server data.
- Invoices page works with the currently-used endpoints (or frontend is updated to admin-specific invoice endpoints).
- Settings page has proper profile + security + delete flows with real endpoints.

