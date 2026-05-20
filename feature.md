from pathlib import Path

content = """# Feature.md

# Vehicle Parts Selling and Inventory Management System

This document lists the main features of the system based on the project requirements and database design.

## 1. Admin Features

### 1.1 Financial Reports
- View daily, monthly, and yearly financial reports
- Track total sales, purchases, profit, and revenue trends
- Support business decision-making through report summaries

### 1.2 Staff Management
- Register new staff members
- Assign roles and permissions
- Edit or remove staff accounts when needed

### 1.3 Parts Management
- Add new vehicle parts into the system
- Edit part information such as name, category, price, and stock quantity
- Delete unavailable or outdated parts

### 1.4 Vendor Management
- Add, update, view, and delete vendor details
- Store vendor contact information and address
- Track parts supplied by each vendor

### 1.5 Purchase Orders and Stock Updates
- Create purchase orders for stock replenishment
- Add multiple items to a purchase order
- Automatically update inventory after stock purchase

### 1.6 Low Stock Monitoring
- Automatically detect when stock falls below the minimum threshold
- Generate low stock alerts for the admin
- Help prevent inventory shortages

---

## 2. Staff Features

### 2.1 Customer Registration
- Register new customers in the system
- Store customer contact details and account information
- Link customers with their vehicle records

### 2.2 Vehicle Management
- Add vehicle details for customers
- Store vehicle number, brand, model, and year
- Maintain ownership and service records

### 2.3 Sales Management
- Sell vehicle parts to customers
- Create sales invoices
- Calculate subtotal, discount, and final amount automatically

### 2.4 Email Invoice Sending
- Send sales invoices to customers by email
- Keep digital records of sent invoices
- Improve customer communication and record keeping

### 2.5 Customer Search
- Search customers by name, phone number, ID, or vehicle number
- Quickly access customer records
- Improve staff efficiency during service and sales

### 2.6 Customer History
- View customer purchase history
- View service history and vehicle details
- Support better customer service and follow-up

### 2.7 Customer Reports
- Identify regular customers
- Detect high-spending customers
- Track customers with pending credit payments

---

## 3. Customer Features

### 3.1 Self-Registration
- Allow customers to create their own accounts
- Manage login credentials securely
- Update profile details after registration

### 3.2 Profile and Vehicle Management
- Edit personal profile information
- Add or update vehicle details
- Keep customer and vehicle data synchronized

### 3.3 Appointment Booking
- Book service appointments online
- Choose a preferred date and time
- Track appointment status

### 3.4 Part Requests
- Request unavailable vehicle parts
- Notify admin about customer demand
- Improve stock planning and customer satisfaction

### 3.5 Reviews and Ratings
- Submit reviews for completed services
- Rate service quality
- Help improve business quality through feedback

### 3.6 Purchase and Service History
- View previous purchases
- View past service records and invoices
- Give customers full access to their records

---

## 4. System Features

### 4.1 Authentication and Authorization
- Secure login and logout system
- Role-based access control for Admin, Staff, and Customers
- Protect sensitive data and functionality

### 4.2 Notifications
- Send alerts for low stock items
- Send email reminders for unpaid customer credits
- Keep users informed about important updates

### 4.3 Loyalty Program
- Apply 10% discount when a customer spends more than 5000 in a single purchase
- Encourage repeat purchases
- Reward loyal customers automatically

### 4.4 AI-Based Prediction
- Analyze vehicle usage and condition data
- Predict possible part failures
- Notify customers in advance for preventive maintenance

### 4.5 Dashboard
- Provide separate dashboards for Admin, Staff, and Customers
- Show important summaries, alerts, and shortcuts
- Improve usability and navigation

### 4.6 Database Integration
- Store all users, vehicles, parts, orders, invoices, alerts, and reviews
- Maintain relationship between tables through foreign keys
- Ensure data consistency and integrity

### 4.7 Error Handling and Validation
- Validate all input data
- Show clear error messages
- Prevent invalid records from being saved

### 4.8 Responsive User Interface
- Make the application easy to use on different screen sizes
- Keep a consistent design across pages
- Improve user experience for all roles

---

## 5. Key Database-Backed Modules
- Users
- Vehicles
- Vendors
- Parts
- Purchase Orders
- Sales Invoices
- Appointments
- Notifications
- Reviews
- Part Requests
- Low Stock Alerts
- Loyalty Discounts
- Refresh Tokens

---

## 6. Conclusion
This system provides a complete solution for vehicle parts selling, inventory control, customer management, and service booking. It supports daily operations for admins, staff, and customers while improving efficiency, customer service, and business monitoring.
"""

-- =========================
-- USERS
-- =========================
CREATE TABLE public.users (
    user_id            INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    full_name          TEXT NOT NULL,
    email              TEXT NOT NULL,
    phone              TEXT NOT NULL,
    address            TEXT,
    password_hash      TEXT NOT NULL,
    role               INTEGER NOT NULL,
    credits_remaining  NUMERIC NOT NULL,
    profile_image_url  TEXT,
    created_at         TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX ix_users_email ON public.users(email);
CREATE UNIQUE INDEX ix_users_phone ON public.users(phone);

-- =========================
-- VENDORS
-- =========================
CREATE TABLE public.vendors (
    vendor_id       INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    vendor_name     TEXT NOT NULL,
    contact_person  TEXT,
    phone           TEXT NOT NULL,
    email           TEXT,
    address         TEXT,
    image_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL
);

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE public.notifications (
    notification_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    log_type        TEXT NOT NULL,
    subject         TEXT NOT NULL,
    message         TEXT NOT NULL,
    mailed_status   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_notifications_user_id ON public.notifications(user_id);

-- =========================
-- PART REQUESTS
-- =========================
CREATE TABLE public.part_requests (
    part_request_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    part_name       TEXT NOT NULL,
    description     TEXT,
    requested_date  TIMESTAMPTZ NOT NULL,
    status          INTEGER NOT NULL
);

CREATE INDEX ix_part_requests_customer_id ON public.part_requests(customer_id);

-- =========================
-- REFRESH TOKENS
-- =========================
CREATE TABLE public.refresh_tokens (
    token_id    INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_revoked  BOOLEAN NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_refresh_tokens_user_id ON public.refresh_tokens(user_id);

-- =========================
-- VEHICLES
-- =========================
CREATE TABLE public.vehicles (
    vehicle_id     INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    customer_id    INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    vehicle_number TEXT NOT NULL,
    brand          TEXT NOT NULL,
    model          TEXT NOT NULL,
    year           INTEGER NOT NULL,
    image_url      TEXT,
    created_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_vehicles_customer_id ON public.vehicles(customer_id);

-- =========================
-- PARTS
-- =========================
CREATE TABLE public.parts (
    part_id                INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    vendor_id              INTEGER NOT NULL REFERENCES public.vendors(vendor_id) ON DELETE CASCADE,
    part_name              TEXT NOT NULL,
    description            TEXT,
    category               TEXT NOT NULL,
    stock_quantity         INTEGER NOT NULL,
    unit                   TEXT NOT NULL,
    cost_price_per_unit    NUMERIC NOT NULL,
    selling_price_per_unit NUMERIC NOT NULL,
    image_url              TEXT,
    created_at             TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_parts_vendor_id ON public.parts(vendor_id);

-- =========================
-- PURCHASE ORDERS
-- =========================
CREATE TABLE public.purchase_orders (
    purchase_order_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    vendor_id         INTEGER NOT NULL REFERENCES public.vendors(vendor_id) ON DELETE CASCADE,
    order_date        TIMESTAMPTZ NOT NULL,
    invoice_number    TEXT NOT NULL,
    total_amount      NUMERIC NOT NULL
);

CREATE INDEX ix_purchase_orders_vendor_id ON public.purchase_orders(vendor_id);

-- =========================
-- PURCHASE ORDER ITEMS
-- =========================
CREATE TABLE public.purchase_order_items (
    purchase_order_item_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    purchase_order_id      INTEGER NOT NULL REFERENCES public.purchase_orders(purchase_order_id) ON DELETE CASCADE,
    part_id                INTEGER NOT NULL REFERENCES public.parts(part_id) ON DELETE CASCADE,
    quantity               INTEGER NOT NULL,
    price_per_unit         NUMERIC NOT NULL
);

CREATE INDEX ix_purchase_order_items_part_id ON public.purchase_order_items(part_id);
CREATE INDEX ix_purchase_order_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);

-- =========================
-- APPOINTMENTS
-- =========================
CREATE TABLE public.appointments (
    appointment_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    customer_id    INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    vehicle_id     INTEGER NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    requested_date TIMESTAMPTZ NOT NULL,
    remarks        TEXT,
    status         INTEGER NOT NULL
);

CREATE INDEX ix_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX ix_appointments_vehicle_id ON public.appointments(vehicle_id);

-- =========================
-- SALES INVOICES
-- =========================
CREATE TABLE public.sales_invoices (
    sales_invoice_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    customer_id      INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    staff_id         INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    vehicle_id       INTEGER NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    invoice_date     TIMESTAMPTZ NOT NULL,
    sub_total        NUMERIC NOT NULL,
    discount_amount  NUMERIC NOT NULL,
    final_amount     NUMERIC NOT NULL,
    is_paid          BOOLEAN NOT NULL,
    due_date         TIMESTAMPTZ
);

CREATE INDEX ix_sales_invoices_customer_id ON public.sales_invoices(customer_id);
CREATE INDEX ix_sales_invoices_staff_id ON public.sales_invoices(staff_id);
CREATE INDEX ix_sales_invoices_vehicle_id ON public.sales_invoices(vehicle_id);

-- =========================
-- SALES INVOICE ITEMS
-- =========================
CREATE TABLE public.sales_invoice_items (
    sales_invoice_item_id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sales_invoice_id      INTEGER NOT NULL REFERENCES public.sales_invoices(sales_invoice_id) ON DELETE CASCADE,
    part_id               INTEGER NOT NULL REFERENCES public.parts(part_id) ON DELETE CASCADE,
    quantity              INTEGER NOT NULL,
    price_per_unit        NUMERIC NOT NULL
);

CREATE INDEX ix_sales_invoice_items_part_id ON public.sales_invoice_items(part_id);
CREATE INDEX ix_sales_invoice_items_sales_invoice_id ON public.sales_invoice_items(sales_invoice_id);

-- =========================
-- LOW STOCK ALERTS
-- =========================
CREATE TABLE public.low_stock_alerts (
    alert_id       INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    part_id        INTEGER NOT NULL REFERENCES public.parts(part_id) ON DELETE CASCADE,
    stock_at_alert INTEGER NOT NULL,
    resolved       BOOLEAN NOT NULL,
    alerted_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_low_stock_alerts_part_id ON public.low_stock_alerts(part_id);

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE public.reviews (
    review_id      INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    customer_id    INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    appointment_id INTEGER NOT NULL REFERENCES public.appointments(appointment_id) ON DELETE CASCADE,
    rating         SMALLINT NOT NULL,
    comment        TEXT,
    reviewed_date  TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_reviews_appointment_id ON public.reviews(appointment_id);
CREATE INDEX ix_reviews_customer_id ON public.reviews(customer_id);

-- =========================
-- SERVICE RECORDS
-- =========================
CREATE TABLE public.service_records (
    service_record_id   INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    appointment_id      INTEGER NOT NULL REFERENCES public.appointments(appointment_id) ON DELETE CASCADE,
    vehicle_id          INTEGER NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    staff_id            INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE RESTRICT,
    service_description TEXT NOT NULL,
    service_cost        NUMERIC NOT NULL,
    service_date        TIMESTAMPTZ NOT NULL,
    status              INTEGER NOT NULL
);

CREATE INDEX ix_service_records_appointment_id ON public.service_records(appointment_id);
CREATE INDEX ix_service_records_staff_id ON public.service_records(staff_id);
CREATE INDEX ix_service_records_vehicle_id ON public.service_records(vehicle_id);

-- =========================
-- LOYALTY DISCOUNTS
-- =========================
CREATE TABLE public.loyalty_discounts (
    loyalty_id       INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sales_invoice_id INTEGER NOT NULL REFERENCES public.sales_invoices(sales_invoice_id) ON DELETE CASCADE,
    customer_id      INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    purchase_amount  NUMERIC NOT NULL,
    discount_applied NUMERIC NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_loyalty_discounts_customer_id ON public.loyalty_discounts(customer_id);
CREATE INDEX ix_loyalty_discounts_sales_invoice_id ON public.loyalty_discounts(sales_invoice_id);