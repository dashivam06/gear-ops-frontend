# Staff Portal Specification

This file describes what the staff portal should contain, how each page should behave, and what data should be shown. It is meant to guide implementation and keep the staff experience complete, clear, and visually strong.

## Role Definition

- Staff is not a customer user.
- Staff accounts are for internal portal use only.
- Staff should see staff-only navigation, staff-only dashboards, and staff-only actions.
- Staff should not be shown customer-only flows unless they are explicitly part of staff support work.
- The UI should always make the role obvious, so staff do not feel like they are inside a customer app.

## Design Expectations

- Each page should show enough information to be useful without forcing extra clicks.
- Prefer complete views over minimal views.
- When opening a vehicle, appointment, customer, invoice, or service record, show all available fields for that entity.
- Use clear cards, tables, badges, dialogs, and summary panels.
- Keep important actions visible and easy to reach.
- Show empty states, loading states, and error states clearly.
- Use a professional admin-style layout with strong hierarchy.
- Avoid hiding useful staff data behind too many collapsed sections.

## Global Staff Portal Rules

- Staff can view everything needed to do work quickly.
- Staff forms should ask for all required details up front.
- When editing an item, prefill existing values whenever possible.
- If a field is optional, label it clearly.
- If a field is unavailable, show a sensible fallback like `—` or `Not provided`.
- Dates should be shown in a readable format.
- Money values should always show a currency symbol and two decimals.
- Status values should use badges or pills.
- When a record has multiple related entities, show those relationships in the UI.

## Navigation Structure

The staff sidebar should contain:

- Overview
- Customers
- Vehicles
- Sales & Invoices
- Appointments
- Service Records
- Reports
- Settings

## Page-by-Page Requirements

### 1. Staff Dashboard

Path: `/staff`

This should be the main overview page for staff.

Show:

- Staff profile summary
- Today’s appointments count
- Upcoming appointments count
- Completed appointments this month
- Average customer rating
- Quick actions
- Revenue summary
- Performance summary

Visual expectations:

- Use stat cards at the top.
- Show quick action cards with clear icons.
- Show a summary card for performance that can link to the reports page.
- Show enough data to understand workload at a glance.

### 2. Staff Profile / Settings

Path: `/staff/settings`

This page is for the staff member’s own profile and account settings.

Ask for and show:

- Full name
- Email
- Phone
- Address
- Profile image
- Join date
- Position
- Active status

If editable fields are supported, allow updates for:

- Full name
- Phone
- Address
- Profile image

Visual expectations:

- Show the staff photo prominently.
- Use a profile identity card.
- Separate personal info from security/account actions.
- Show save feedback clearly.

### 3. Appointments

Path: `/staff/appointments`

This page should help staff manage the day’s work.

Show all appointment data that is available:

- Appointment ID
- Vehicle number
- Vehicle ID if available
- Customer name
- Customer phone
- Appointment date and time
- Description or service notes
- Status
- Created at

If a service is started from an appointment, show the service creation flow with:

- Appointment selection
- Service description
- Service cost
- Service status

Visual expectations:

- Use a table with clear actions.
- Show status badges.
- Allow filtering or search if useful.
- Make the page easy to scan for upcoming work.

### 4. Service Records

Path: `/staff/service-records`

This page should show every service record and make it easy to inspect completed work.

Show:

- Service record ID
- Appointment ID
- Vehicle number
- Vehicle ID if available
- Customer name
- Service description
- Service cost
- Service date
- Status
- Review rating if available
- Review comment if available
- Created at if available

When viewing a service record, show the full detail panel or modal.

Monthly view should show:

- Year
- Month
- Monthly service list
- Monthly totals if available

Visual expectations:

- Show summary cards for total records, completed records, revenue, and average cost.
- Use a searchable table.
- Use a detail dialog for full record inspection.

### 5. Reports

Path: `/staff/reports`

This page should present performance clearly and visually.

Performance report should show:

- Staff ID
- Staff name
- Position
- Total appointments completed
- Total service records
- Total revenue generated
- Average service cost
- Average customer rating
- Pending appointments
- Report generated time

Monthly report should show:

- Year
- Month
- Total revenue
- Completed services
- Average cost per service
- Average customer rating
- Total appointments
- Cancelled appointments

Visual expectations:

- Use separate cards for key metrics.
- Show a month selector.
- Include a summary section with high-value numbers.
- Make it easy to compare performance across time.

### 6. Customers

Path: `/staff/customers`

This page should show customer records relevant to staff work.

Show all customer data available:

- Customer ID
- Full name
- Email
- Phone
- Address
- Credits or balance if available
- Profile image
- Created at
- Vehicles list if available

If search is supported, include:

- Search by name
- Search by email
- Search by phone

Visual expectations:

- Use a table or card list.
- Show customer-related vehicles inline or in a detail drawer.
- Make customer profile data easy to inspect.

### 7. Vehicles

Path: `/staff/vehicles`

This page should show vehicle information in a staff-friendly way.

Show all available vehicle data:

- Vehicle ID
- Vehicle number / plate
- Make
- Model
- Year
- Customer name
- Customer phone if available
- Status
- Last service date if available

If vehicle history is available, show:

- Prior appointments
- Prior service records
- Related invoices

Visual expectations:

- Use a readable list or table.
- Show vehicle ownership clearly.
- Keep vehicle identity and service history together.

### 8. Sales & Invoices

Path: `/staff/invoices`

This page should support invoice creation and review.

Show:

- Invoice ID
- Customer name
- Vehicle number
- Invoice date
- Due date
- Subtotal
- Discount amount
- Final amount
- Paid status
- Line items if available

If creating an invoice, ask for:

- Customer
- Vehicle
- Due date
- Payment status
- Items or parts
- Quantity per item
- Price per unit
- Discount if supported

Visual expectations:

- Show invoice totals prominently.
- Use a clear itemized section.
- Make payment status obvious.

## What “Ask Everything” Means

When staff opens a record or starts a new action, the UI should collect and show all relevant data for that workflow.

Examples:

- For a vehicle: show identity, owner, service history, status, and dates.
- For an appointment: show customer, vehicle, notes, schedule, and current state.
- For a service record: show appointment link, service details, cost, review, and timestamps.
- For an invoice: show customer, vehicle, items, totals, and payment state.
- For a profile: show identity, contact details, role, and avatar.

## Visual Completeness Rules

- Do not leave pages with only one or two fields if more data is available.
- Every list page should have a top summary and a detailed table/list below.
- Every detail page should show the full object, not a partial subset, unless the backend truly lacks the data.
- Use a strong visual hierarchy so staff can understand the page in a few seconds.
- Use section headers, muted labels, and bold values.
- Use dialogs or side panels for dense detail views.

## Empty State Rules

If staff has no data yet, the UI should not look broken.

Show messages such as:

- No appointments found.
- No service records available.
- No invoices created yet.
- No customers found.
- No vehicles available.

When possible, also show a helpful next step:

- Create a service record
- Add a customer
- Start an appointment
- Generate an invoice

## Access Rules

- Staff portal is for staff-only login sessions.
- Staff routes should not behave like customer routes.
- Staff should have access to staff dashboards and staff operations.
- If a staff user is missing a profile or token, redirect to login or show a safe access state.

## Implementation Notes

- Keep data fetching centralized through the API layer.
- Reuse shared UI components for tables, dialogs, badges, inputs, and buttons.
- Prefer showing server data directly instead of recreating it in the UI.
- Keep forms and tables consistent across staff pages.
- If a backend endpoint returns more data later, the UI should be ready to surface it.

## Completion Standard

The staff portal is complete when:

- Every staff route is reachable from the sidebar.
- Dashboard shows workload and performance clearly.
- Profile settings support staff profile management.
- Appointments, service records, reports, customers, vehicles, and invoices all show full useful data.
- Forms ask for all relevant information.
- Detail views show all available fields.
- The UI feels polished, dense, and genuinely useful for staff work.
