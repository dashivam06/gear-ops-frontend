import { useAuthStore } from "@/lib/store/auth-store";
import { getAccessTokenCookie } from "@/lib/auth";

const API_BASE_URL = "http://localhost:7777";

// ─── Envelope & Error ────────────────────────────────────────────────
type ApiEnvelope<T> = {
  timestamp: string;
  status: number;
  success: boolean;
  message: string;
  path: string;
  method: string;
  data: T;
};

export class ApiRequestError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────
export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

function getToken(): string | null {
  // Try Zustand store first, then fall back to cookie
  return useAuthStore.getState().accessToken || getAccessTokenCookie();
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    const message = json?.message ?? "Request failed";
    throw new ApiRequestError(message, response.status);
  }
  if (!json) throw new Error("Invalid server response");
  return json.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<{ data: T; message?: string }> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    const message = json?.message ?? "Request failed";
    throw new ApiRequestError(message, response.status);
  }
  if (!json) throw new Error("Invalid server response");
  return { data: json.data, message: json.message };
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { method: "GET", headers: authHeaders() });
  return handleResponse<T>(response);
}

async function apiPostAuth<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "PUT",
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "PATCH",
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { method: "DELETE", headers: authHeaders() });
  return handleResponse<T>(response);
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = obj[k];
      if (v !== undefined && v !== null) return v as T;
    }
  }
  return undefined;
}

function toOptionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** Anonymous GET (e.g. public availability). Uses same JSON envelope as authenticated routes. */
async function apiGetPublic<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return handleResponse<T>(response);
}

// ─── Auth ────────────────────────────────────────────────────────────
export async function logoutAuth() {
  await apiPostAuth<{ loggedOut: boolean }>("/api/v1/auth/logout");
}

export async function requestPasswordReset(email: string) {
  return apiPost<{ verificationId: string }>("/api/v1/auth/request-password-reset", { email });
}

export async function verifyPasswordResetOtp(verificationId: string, otp: string) {
  return apiPost<{ verified: boolean }>("/api/v1/auth/verify-password-reset-otp", { verificationId, otp });
}

export async function resetPassword(verificationId: string, newPassword: string, confirmPassword: string) {
  return apiPost<{ updated: boolean }>("/api/v1/auth/reset-password", { verificationId, newPassword, confirmPassword });
}

// ─── Profile (Customer) ─────────────────────────────────────────────
export async function getProfile(_token?: string, _user?: any) {
  return apiGet<{
    userId: number;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    creditsRemaining: number;
    profileImageUrl: string;
    createdAt: string;
    vehicles: Vehicle[];
    emailSubscribed?: boolean;
    status?: string;
  }>("/api/v1/customers/profile");
}

export async function updateProfile(_token: string, payload: any) {
  const result = await apiPut<{
    userId: number;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    profileImageUrl: string;
    createdAt: string;
  }>("/api/v1/customers/profile", {
    fullName: payload.fullName,
    phone: payload.phone,
    address: payload.address,
    profileImageUrl: payload.profileImage || payload.profileImageUrl,
  });
  return {
    fullName: result.fullName,
    profileImageUrl: result.profileImageUrl,
    emailSubscribed: payload.emailSubscribed ?? true,
    status: "ACTIVE",
  };
}

export async function changePassword(_token: string, payload: any) {
  return apiPostAuth<any>("/api/v1/auth/change-password", payload);
}

export async function deleteAccount(_token: string, payload: any) {
  // Using POST since we need to send the password in the body securely.
  return apiPostAuth<any>("/api/v1/auth/delete-account", payload);
}

// ─── Admin: Staff Management ────────────────────────────────────────
export interface StaffMember {
  staffId: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  profileImageUrl?: string;
  joinDate: string;
  isActive: boolean;
  createdAt: string;
}

export async function getStaffList(_token: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<StaffMember>>(`/api/v1/admin/staff?page=${page}&pageSize=${pageSize}`);
}

export async function createStaff(_token: string, payload: any) {
  return apiPostAuth<StaffMember>("/api/v1/admin/staff", payload);
}

export async function updateStaff(_token: string, staffId: number, payload: any) {
  return apiPut<StaffMember>(`/api/v1/admin/staff/${staffId}`, payload);
}

export async function deleteStaff(_token: string, staffId: number) {
  return apiDelete<null>(`/api/v1/admin/staff/${staffId}`);
}

export async function toggleStaffStatus(_token: string, staffId: number, isActive: boolean) {
  return apiPatch<null>(`/api/v1/admin/staff/${staffId}/status`, { isActive });
}

// ─── Admin: Vendor Management ───────────────────────────────────────
export interface Vendor {
  vendorId: number;
  vendorName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  imageUrl?: string;
  createdAt?: string;
}

export async function getVendors(_token: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<Vendor>>(`/api/v1/admin/vendors?page=${page}&pageSize=${pageSize}`);
}

export async function createVendor(_token: string, payload: any) {
  return apiPostAuth<Vendor>("/api/v1/admin/vendors", payload);
}

export async function updateVendor(_token: string, vendorId: number, payload: any) {
  return apiPut<Vendor>(`/api/v1/admin/vendors/${vendorId}`, payload);
}

export async function deleteVendor(_token: string, vendorId: number) {
  return apiDelete<null>(`/api/v1/admin/vendors/${vendorId}`);
}

// ─── Admin: Part Management ─────────────────────────────────────────
export interface Part {
  partId: number;
  vendorId: number;
  vendorName?: string;
  partName: string;
  description: string;
  category: string;
  stockQuantity: number;
  unit: string;
  costPricePerUnit: number;
  sellingPricePerUnit: number;
  imageUrl?: string;
  createdAt?: string;
}

export async function getParts(_token: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<Part>>(`/api/v1/admin/parts?page=${page}&pageSize=${pageSize}`);
}

export async function getAdminPartsByCategory(_token: string, category: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<Part>>(
    `/api/v1/admin/parts/category/${encodeURIComponent(category)}?page=${page}&pageSize=${pageSize}`
  );
}

export async function searchAdminParts(_token: string, query: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<Part>>(
    `/api/v1/admin/parts/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
  );
}

export async function createPart(_token: string, payload: any) {
  return apiPostAuth<Part>("/api/v1/admin/parts", payload);
}

export async function updatePart(_token: string, partId: number, payload: any) {
  return apiPut<Part>(`/api/v1/admin/parts/${partId}`, payload);
}

export async function deletePart(_token: string, partId: number) {
  return apiDelete<null>(`/api/v1/admin/parts/${partId}`);
}

// ─── Admin: Purchase Orders ─────────────────────────────────────────
export interface PurchaseOrderItem {
  partId: number;
  partName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}

/** Backend enum: Draft=0, SentToVendor=1, ConfirmedByVendor=2, Delivered=3, Cancelled=4 */
export interface PurchaseOrderLog {
  purchaseOrderLogId: number;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  notes?: string;
  emailSentToVendor?: boolean;
  createdAt: string;
}

export interface PurchaseOrder {
  purchaseOrderId: number;
  vendorId: number;
  vendorName?: string;
  orderDate: string;
  invoiceNumber?: string | null;
  totalAmount: number;
  /** Numeric status when API sends it */
  status?: number;
  /** Prefer for display */
  statusText?: string;
  /** When false, keep forms read-only */
  isEditable?: boolean;
  sentToVendorAt?: string | null;
  confirmedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  items?: PurchaseOrderItem[];
  logs?: PurchaseOrderLog[];
}

export type PurchaseOrderCreatePayload = {
  vendorId: number;
  invoiceNumber: string | null;
  items: { partId: number; quantity: number; unitPrice: number }[];
};

export async function createPurchaseOrder(_token: string, payload: PurchaseOrderCreatePayload) {
  return apiPostAuth<PurchaseOrder>("/api/v1/admin/purchase-orders", payload);
}

export async function updatePurchaseOrder(
  _token: string,
  purchaseOrderId: number,
  payload: { invoiceNumber?: string | null; notes?: string | null; items: { partId: number; quantity: number; unitPrice: number }[] }
) {
  return apiPut<PurchaseOrder>(`/api/v1/admin/purchase-orders/${purchaseOrderId}`, payload);
}

export async function sendPurchaseOrderToVendor(_token: string, purchaseOrderId: number, body: { message: string }) {
  return apiPostAuth<PurchaseOrder>(`/api/v1/admin/purchase-orders/${purchaseOrderId}/send-to-vendor`, body);
}

export async function confirmPurchaseOrder(_token: string, purchaseOrderId: number, body: { invoiceNumber: string; notes?: string | null }) {
  return apiPostAuth<PurchaseOrder>(`/api/v1/admin/purchase-orders/${purchaseOrderId}/confirm`, body);
}

export async function deliverPurchaseOrder(_token: string, purchaseOrderId: number, body: { notes?: string | null }) {
  return apiPostAuth<PurchaseOrder>(`/api/v1/admin/purchase-orders/${purchaseOrderId}/deliver`, body);
}

export async function getPurchaseOrders(_token: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<PurchaseOrder>>(`/api/v1/admin/purchase-orders?page=${page}&pageSize=${pageSize}`);
}

export async function getPurchaseOrderById(_token: string, purchaseOrderId: number) {
  return apiGet<PurchaseOrder>(`/api/v1/admin/purchase-orders/${purchaseOrderId}`);
}

export async function getPurchaseOrdersByVendor(_token: string, vendorId: number) {
  return apiGet<PurchaseOrder[]>(`/api/v1/admin/vendors/${vendorId}/purchase-orders`);
}

export async function getAdminStaffById(_token: string, staffId: number) {
  return apiGet<StaffMember>(`/api/v1/admin/staff/${staffId}`);
}

export async function getAdminVendorById(_token: string, vendorId: number) {
  return apiGet<Vendor>(`/api/v1/admin/vendors/${vendorId}`);
}

export async function getAdminPartById(_token: string, partId: number) {
  return apiGet<Part>(`/api/v1/admin/parts/${partId}`);
}

export async function getVendorParts(_token: string, vendorId: number) {
  return apiGet<Part[]>(`/api/v1/admin/vendors/${vendorId}/parts`);
}

// ─── Admin: Reports ─────────────────────────────────────────────────
export interface FinancialReport {
  reportDate?: string;
  period?: string;
  totalSalesRevenue?: number;
  totalPurchaseCost?: number;
  grossProfit?: number;
  /** Percentage, e.g. 60.0 = 60% */
  profitMargin?: number;
  totalTransactions?: number;
  totalPartsMovement?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
}

export async function getFinancialReport(period: "Daily" | "Monthly" | "Yearly" = "Daily", year?: number, month?: number) {
  let url = `/api/v1/admin/reports/financial?period=${encodeURIComponent(period)}`;
  if (year != null) url += `&year=${year}`;
  if (month != null) url += `&month=${month}`;
  return apiGet<FinancialReport>(url);
}

/** Single calendar day (`YYYY-MM-DD`) — upgraded financial endpoint. */
export async function getFinancialReportForDate(date: string) {
  return apiGet<FinancialReport>(`/api/v1/admin/reports/financial?date=${encodeURIComponent(date)}`);
}

/** Inclusive date range (`YYYY-MM-DD`). */
export async function getFinancialReportRange(startDate: string, endDate: string) {
  const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  return apiGet<FinancialReport>(`/api/v1/admin/reports/financial/range?${q}`);
}

/** PDF uploaded to Cloudinary; returns public URL string (normalizes common DTO keys). */
export async function postFinancialReportRangePdf(startDate: string, endDate: string): Promise<string> {
  const q = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const data = await apiPostAuth<unknown>(`/api/v1/admin/reports/financial/range/pdf?${q}`, {});
  if (typeof data === "string" && /^https?:\/\//i.test(data)) return data;
  if (!data || typeof data !== "object") throw new Error("Invalid PDF response");
  const o = data as Record<string, unknown>;
  const nested = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o;
  const url = pick<string>(nested, "pdfUrl", "PdfUrl", "url", "Url", "secureUrl", "SecureUrl", "fileUrl", "FileUrl");
  if (url && /^https?:\/\//i.test(url)) return url;
  throw new Error("No PDF URL in response");
}

export async function getInventoryReport() {
  return apiGet<any[]>("/api/v1/admin/reports/inventory");
}

export async function getLowStockParts(threshold = 10) {
  return apiGet<any[]>(`/api/v1/admin/reports/low-stock?threshold=${threshold}`);
}

// ─── Customer: Vehicles ─────────────────────────────────────────────
export interface Vehicle {
  vehicleId: number;
  vehicleNumber: string;
  brand: string;
  model: string;
  year: number;
  imageUrl?: string;
  createdAt?: string;
}

export async function getCustomerVehicles(_token: string) {
  return apiGet<Vehicle[]>("/api/v1/customers/vehicles");
}

export async function getCustomerVehicleById(_token: string, vehicleId: number) {
  return apiGet<Vehicle>(`/api/v1/customers/vehicles/${vehicleId}`);
}

export async function createCustomerVehicle(_token: string, payload: any) {
  return apiPostAuth<Vehicle>("/api/v1/customers/vehicles", payload);
}

export async function updateCustomerVehicle(_token: string, vehicleId: number, payload: any) {
  return apiPut<Vehicle>(`/api/v1/customers/vehicles/${vehicleId}`, payload);
}

export async function deleteCustomerVehicle(_token: string, vehicleId: number) {
  return apiDelete<null>(`/api/v1/customers/vehicles/${vehicleId}`);
}

// Keep old names as aliases for backward compat during migration
export const getVehiclesByCustomer = (_token: string, _customerId?: number) => getCustomerVehicles(_token);
export const createVehicle = (_token: string, payload: any) => createCustomerVehicle(_token, payload);
export const updateVehicle = (_token: string, vehicleId: number, payload: any) => updateCustomerVehicle(_token, vehicleId, payload);
export const deleteVehicle = (_token: string, vehicleId: number) => deleteCustomerVehicle(_token, vehicleId);

// ─── Customer: Appointments ─────────────────────────────────────────
export interface Appointment {
  appointmentId: number;
  vehicleId: number;
  vehicleNumber: string;
  appointmentDate: string;
  description: string;
  status: string;
  approvalNotes?: string;
  createdAt?: string;
}

export interface AvailableTimeSlot {
  slotNumber: number;
  displayTime: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isBreak: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  timeSlots: AvailableTimeSlot[];
  totalAvailableSlots?: number;
  totalBookedSlots?: number;
}

/** Public: load slot grid for a calendar day (yyyy-MM-dd). */
export async function getAvailableAppointmentSlots(date: string) {
  return apiGetPublic<AvailableSlotsResponse>(
    `/api/v1/staff/appointments/available-slots?date=${encodeURIComponent(date)}`
  );
}

function normalizeCustomerAppointment(raw: unknown): Appointment {
  if (!raw || typeof raw !== "object") {
    return {
      appointmentId: 0,
      vehicleId: 0,
      vehicleNumber: "",
      appointmentDate: "",
      description: "",
      status: "",
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    appointmentId: Number(pick(o, "appointmentId", "AppointmentId") ?? 0),
    vehicleId: Number(pick(o, "vehicleId", "VehicleId") ?? 0),
    vehicleNumber: String(pick(o, "vehicleNumber", "VehicleNumber") ?? ""),
    appointmentDate:
      pick<string>(o, "appointmentDate", "AppointmentDate", "requestedDate", "RequestedDate") ?? "",
    description: pick<string>(o, "description", "Description", "remarks", "Remarks") ?? "",
    status: String(pick(o, "status", "Status") ?? ""),
    approvalNotes: pick<string>(o, "approvalNotes", "ApprovalNotes"),
    createdAt: pick<string>(o, "createdAt", "CreatedAt"),
  };
}

export async function getCustomerAppointments(_token: string) {
  const rows = await apiGet<unknown[]>("/api/v1/customers/appointments");
  return rows.map(normalizeCustomerAppointment);
}

export async function getCustomerUpcomingAppointments(_token: string) {
  const rows = await apiGet<unknown[]>("/api/v1/customers/appointments/upcoming");
  return rows.map(normalizeCustomerAppointment);
}

export async function createCustomerAppointment(
  _token: string,
  payload: { vehicleId: number; requestedDate: string; remarks?: string }
) {
  return apiPostAuth<Appointment>("/api/v1/customers/appointments", {
    vehicleId: payload.vehicleId,
    requestedDate: payload.requestedDate,
    remarks: payload.remarks ?? "",
  });
}

export async function updateCustomerAppointment(_token: string, appointmentId: number, payload: Record<string, unknown>) {
  return apiPut<unknown>(`/api/v1/customers/appointments/${appointmentId}`, payload);
}

export async function cancelCustomerAppointment(_token: string, appointmentId: number) {
  return apiDelete<null>(`/api/v1/customers/appointments/${appointmentId}`);
}

// Backward compat aliases
export const getAppointmentsByCustomer = (_token: string, _customerId?: number) => getCustomerAppointments(_token);
export const createAppointment = (_token: string, payload: any) =>
  createCustomerAppointment(_token, {
    vehicleId: payload.vehicleId,
    requestedDate: payload.requestedDate || payload.appointmentDate,
    remarks: payload.remarks ?? payload.description ?? "",
  });

// ─── Customer: Reviews ──────────────────────────────────────────────
export interface Review {
  reviewId: number;
  appointmentId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export async function getCustomerReviews(_token: string) {
  return apiGet<Review[]>("/api/v1/customers/reviews");
}

export async function createCustomerReview(_token: string, payload: { appointmentId: number; rating: number; comment: string }) {
  return apiPostAuth<Review>("/api/v1/customers/reviews", payload);
}

export async function deleteCustomerReview(_token: string, reviewId: number) {
  return apiDelete<null>(`/api/v1/customers/reviews/${reviewId}`);
}

// Backward compat aliases
export const getReviewsByCustomer = (_token: string, _customerId?: number) => getCustomerReviews(_token);
export const createReview = (_token: string, payload: any) =>
  createCustomerReview(_token, {
    appointmentId: payload.appointmentId,
    rating: payload.rating,
    comment: payload.comment || "",
  });

// ─── Customer: Part Requests ────────────────────────────────────────
export interface PartRequest {
  partRequestId: number;
  partName: string;
  description: string;
  vehicleId: number;
  vehicleNumber?: string;
  status: string;
  createdAt: string;
  reviewedByStaffId?: number | null;
  reviewedAt?: string | null;
  decisionNote?: string | null;
  suggestedPartId?: number | null;
}

export interface CatalogPart {
  partId: number;
  vendorId: number;
  vendorName?: string;
  partName: string;
  description?: string;
  category: string;
  stockQuantity: number;
  unit: string;
  costPricePerUnit?: number;
  sellingPricePerUnit: number;
  imageUrl?: string | null;
  createdAt?: string;
}

// ─── Customer: Parts Catalog ────────────────────────────────────────
export async function getCustomerParts(_token: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<CatalogPart>>(`/api/v1/customers/parts?page=${page}&pageSize=${pageSize}`);
}

export async function getCustomerPartsByCategory(_token: string, category: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<CatalogPart>>(
    `/api/v1/customers/parts/category/${encodeURIComponent(category)}?page=${page}&pageSize=${pageSize}`
  );
}

export async function searchCustomerParts(_token: string, query: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<CatalogPart>>(
    `/api/v1/customers/parts/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
  );
}

export async function getCustomerPartRequests(_token: string) {
  return apiGet<PartRequest[]>("/api/v1/customers/part-requests");
}

export async function getCustomerPendingPartRequests(_token: string) {
  return apiGet<PartRequest[]>("/api/v1/customers/part-requests/pending");
}

export async function createCustomerPartRequest(_token: string, payload: { partName: string; description: string; vehicleId: number }) {
  return apiPostAuth<PartRequest>("/api/v1/customers/part-requests", payload);
}

// Backward compat aliases
export const getPartRequestsByCustomer = (_token: string, _customerId?: number) => getCustomerPartRequests(_token);
export const createPartRequest = (_token: string, payload: any) =>
  createCustomerPartRequest(_token, {
    partName: payload.partName,
    description: payload.description || "",
    vehicleId: payload.vehicleId || 0,
  });

// ─── Staff: Parts Catalog / Part Requests ───────────────────────────
export async function getStaffParts(_token: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<CatalogPart>>(`/api/v1/staff/parts?page=${page}&pageSize=${pageSize}`);
}

export async function getStaffPartsByCategory(_token: string, category: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<CatalogPart>>(
    `/api/v1/staff/parts/category/${encodeURIComponent(category)}?page=${page}&pageSize=${pageSize}`
  );
}

export async function searchStaffParts(_token: string, query: string, page = 1, pageSize = 20) {
  return apiGet<PaginatedResponse<CatalogPart>>(
    `/api/v1/staff/parts/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
  );
}

export async function getStaffPartRequests(_token: string, page = 1, pageSize = 20, search?: string, status?: string) {
  const query = search ? `&search=${encodeURIComponent(search)}` : "";
  const statusQuery = status ? `&status=${encodeURIComponent(status)}` : "";
  const raw = await apiGet<unknown>(`/api/v1/staff/part-requests?page=${page}&pageSize=${pageSize}${query}${statusQuery}`);
  if (raw && typeof raw === 'object' && 'items' in raw) {
      const o = raw as Record<string, unknown>;
      const listRaw = (o.items as unknown[]) || [];
      return {
          items: listRaw, // PartRequest mapping if needed, but they are already compatible
          page: Number(o.page ?? 1),
          pageSize: Number(o.pageSize ?? listRaw.length),
          totalItems: Number(o.totalItems ?? listRaw.length),
          totalPages: Number(o.totalPages ?? 1),
          hasPreviousPage: Boolean(o.hasPreviousPage),
          hasNextPage: Boolean(o.hasNextPage),
      } as PaginatedResponse<PartRequest>;
  }
  return {
      items: Array.isArray(raw) ? raw : [],
      page: 1, pageSize: 20, totalItems: Array.isArray(raw) ? raw.length : 0, totalPages: 1, hasPreviousPage: false, hasNextPage: false
  };
}

export async function getStaffPendingPartRequests(_token: string) {
  return apiGet<PartRequest[]>("/api/v1/staff/part-requests/pending");
}

export async function approveStaffPartRequest(_token: string, partRequestId: number, decisionNote: string) {
  return apiPatch<PartRequest>(`/api/v1/staff/part-requests/${partRequestId}/approve`, { decisionNote });
}

export async function rejectStaffPartRequest(_token: string, partRequestId: number, decisionNote: string) {
  return apiPatch<PartRequest>(`/api/v1/staff/part-requests/${partRequestId}/reject`, { decisionNote });
}

export async function escalateStaffPartRequest(_token: string, partRequestId: number, decisionNote: string, partId?: number) {
  return apiPatch<PartRequest>(`/api/v1/staff/part-requests/${partRequestId}/escalate`, { decisionNote, partId: partId || undefined });
}

// ─── Customer: Buy Parts Directly ───────────────────────────────────
export async function buyPartsDirectly(_token: string, payload: { vehicleId?: number; items: { partId: number; quantity: number }[] }) {
  return apiPostAuth<CustomerPurchase>("/api/v1/customers/purchase-parts", payload);
}

// ─── Admin: Part Request Order ──────────────────────────────────────
export async function adminOrderPartRequest(
  _token: string,
  partRequestId: number,
  payload: { partId?: number | null; vendorId: number; quantity: number; unitPrice: number; notes?: string; newPartCategory?: string }
) {
  return apiPostAuth<any>(`/api/v1/admin/part-requests/${partRequestId}/order`, payload);
}

// ─── Customer: Purchases / Invoices ─────────────────────────────────
export interface CustomerPurchaseItem {
  partId: number;
  partName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  /** Legacy shape from older API docs */
  itemId?: number;
  unitPrice?: number;
}

export interface CustomerPurchase {
  /** Backend may return sales invoice id */
  salesInvoiceId?: number;
  invoiceId?: number;
  invoiceNumber?: string;
  vehicleId?: number;
  vehicleNumber?: string;
  totalAmount: number;
  invoiceDate: string;
  /** Backend: "Paid" | "Unpaid" etc. */
  paymentStatus?: string;
  status?: string;
  items?: CustomerPurchaseItem[];
}

export async function getCustomerPurchases(_token: string) {
  return apiGet<CustomerPurchase[]>("/api/v1/customers/purchases");
}

export async function getCustomerPurchaseDetail(_token: string, invoiceId: number) {
  return apiGet<CustomerPurchase>(`/api/v1/customers/purchases/${invoiceId}`);
}

// Backward compat alias
export const getInvoicesByCustomer = (_token: string, _customerId?: number) => getCustomerPurchases(_token);

// ─── Customer: Services ─────────────────────────────────────────────
export interface CustomerService {
  serviceRecordId: number;
  appointmentId?: number;
  description?: string;
  issueReported?: string;
  staffAnswer?: string;
  cost?: number;
  serviceDate: string;
  vehicleNumber: string;
  vehicleId?: number;
  status?: string;
  createdAt?: string;
}

export async function getCustomerServices(_token: string) {
  return apiGet<CustomerService[]>("/api/v1/customers/services");
}

// Backward compat alias
export const getServiceRecordsByCustomer = (_token: string, _customerId?: number) => getCustomerServices(_token);

// ─── Customer: Dashboard ────────────────────────────────────────────
export interface CustomerDashboard {
  profile: { userId: number; fullName: string; email: string; phone: string; profileImageUrl: string };
  creditBalance: { totalCredit: number; usedCredit: number; availableCredit: number; lastUpdated: string };
  loyaltyStatus: { pointsEarned: number; pointsRedeemed: number; availablePoints: number; loyaltyTier: string };
  upcomingAppointments: Appointment[];
  pendingPartRequests: PartRequest[];
}

export async function getCustomerDashboard(_token: string) {
  return apiGet<CustomerDashboard>("/api/v1/customers/dashboard");
}

// ─── Customer: History Summary ──────────────────────────────────────
export async function getCustomerHistorySummary(_token: string) {
  return apiGet<any>("/api/v1/customers/history-summary");
}

// ─── Customer: Loyalty & Credits ────────────────────────────────────
export async function getCustomerLoyalty(_token: string) {
  return apiGet<any>("/api/v1/customers/loyalty");
}

export async function getCustomerCredits(_token: string) {
  return apiGet<any>("/api/v1/customers/credits");
}

// ─── Customer: Invoice PDF ──────────────────────────────────────────
export function getInvoicePdfUrl(invoiceId: number) {
  return apiUrl(`/api/v1/customers/invoices/${invoiceId}/pdf`);
}

// ─── Staff: Dashboard ───────────────────────────────────────────────
export interface StaffDashboard {
  profile: { staffId: number; fullName: string; position: string; joinDate: string; profileImageUrl: string };
  schedule: { todayAppointments: number; upcomingAppointments: number; completedAppointmentsThisMonth: number; todaySchedule: any[]; };
  performance: { totalAppointmentsCompleted: number; totalRevenueGenerated: number; averageCustomerRating: number; averageServiceCost: number };
  monthlyMetrics: { completedServices: number; monthlyRevenue: number; averageCostPerService: number; averageRating: number };
}

export async function getStaffDashboard(_token: string) {
  const raw = await apiGet<any>("/api/v1/staff/dashboard");
  return {
    profile: raw.profile,
    schedule: raw.scheduleSummary || raw.schedule,
    performance: raw.performanceMetrics || raw.performance,
    monthlyMetrics: raw.monthlyMetrics
  } as StaffDashboard;
}

// ─── Staff: Schedule ────────────────────────────────────────────────
export interface StaffAppointment {
  appointmentId: number;
  customerId: number;
  vehicleId?: number;
  vehicleNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  appointmentDate: string;
  description?: string;
  status: string;
  createdAt?: string;
  isInvoiced: boolean;
  approvalNotes?: string;
}

function normalizeStaffAppointment(raw: unknown): StaffAppointment {
  if (!raw || typeof raw !== "object") {
    return {
      appointmentId: 0,
      customerId: 0,
      vehicleNumber: "",
      customerName: "",
      appointmentDate: "",
      status: "Pending",
      isInvoiced: false,
    };
  }
  const o = raw as Record<string, unknown>;
  const phoneRaw = pick(o, "customerPhone", "CustomerPhone", "phone", "Phone");
  return {
    appointmentId: Number(pick(o, "appointmentId", "AppointmentId")) || 0,
    customerId: Number(pick(o, "customerId", "CustomerId")) || 0,
    vehicleId: Number(pick(o, "vehicleId", "VehicleId")) || undefined,
    vehicleNumber: String(pick(o, "vehicleNumber", "VehicleNumber") || ""),
    customerName: String(pick(o, "customerName", "CustomerName") || ""),
    customerPhone: phoneRaw !== undefined && phoneRaw !== null ? String(phoneRaw) : undefined,
    customerEmail: pick<string>(o, "customerEmail", "CustomerEmail", "email", "Email"),
    appointmentDate:
      String(pick(o, "appointmentDate", "AppointmentDate", "requestedDate", "RequestedDate") ?? ""),
    description: pick<string>(o, "description", "Description", "remarks", "Remarks"),
    status: String(pick(o, "status", "Status") ?? ""),
    createdAt: pick<string>(o, "createdAt", "CreatedAt"),
    isInvoiced: Boolean(pick(o, "isInvoiced", "IsInvoiced") ?? false),
    approvalNotes: pick<string>(o, "approvalNotes", "ApprovalNotes"),
  };
}

export async function getStaffTodayAppointments(_token: string) {
  const rows = await apiGet<unknown[]>("/api/v1/staff/schedule/today");
  return rows.map(normalizeStaffAppointment);
}

export async function getStaffUpcomingAppointments(_token: string) {
  const rows = await apiGet<unknown[]>("/api/v1/staff/schedule/upcoming");
  return rows.map(normalizeStaffAppointment);
}

export async function getStaffAllAppointments(_token: string, page = 1, pageSize = 20, search?: string) {
  const query = search ? `&search=${encodeURIComponent(search)}` : "";
  const raw = await apiGet<unknown>(`/api/v1/staff/schedule/all?page=${page}&pageSize=${pageSize}${query}`);
  if (raw && typeof raw === 'object' && 'items' in raw) {
      const o = raw as Record<string, unknown>;
      const listRaw = (o.items as unknown[]) || [];
      return {
          items: listRaw.map(normalizeStaffAppointment),
          page: Number(o.page ?? 1),
          pageSize: Number(o.pageSize ?? listRaw.length),
          totalItems: Number(o.totalItems ?? listRaw.length),
          totalPages: Number(o.totalPages ?? 1),
          hasPreviousPage: Boolean(o.hasPreviousPage),
          hasNextPage: Boolean(o.hasNextPage),
      } as PaginatedResponse<StaffAppointment>;
  }
  return {
      items: Array.isArray(raw) ? raw.map(normalizeStaffAppointment) : [],
      page: 1, pageSize: 20, totalItems: Array.isArray(raw) ? raw.length : 0, totalPages: 1, hasPreviousPage: false, hasNextPage: false
  };
}

export async function getStaffAppointmentDetail(_token: string, appointmentId: number) {
  const raw = await apiGet<unknown>(`/api/v1/staff/schedule/${appointmentId}`);
  return normalizeStaffAppointment(raw);
}

export async function getStaffScheduleSummary(_token: string) {
  return apiGet<any>("/api/v1/staff/schedule/summary");
}

export async function approveStaffAppointment(_token: string, appointmentId: number, notes?: string) {
  return apiPostAuth<unknown>(`/api/v1/staff/appointments/${appointmentId}/approve`, {
    decision: "Approved",
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  });
}

export async function rejectStaffAppointment(_token: string, appointmentId: number, notes: string) {
  return apiPostAuth<unknown>(`/api/v1/staff/appointments/${appointmentId}/reject`, {
    decision: "Rejected",
    notes: notes.trim(),
  });
}

export async function completeStaffAppointment(_token: string, appointmentId: number) {
  return apiPostAuth<unknown>(`/api/v1/staff/appointments/${appointmentId}/complete`, {});
}

export async function staffAppointmentNoShow(_token: string, appointmentId: number, notes?: string) {
  return apiPostAuth<unknown>(
    `/api/v1/staff/appointments/${appointmentId}/no-show`,
    notes?.trim() ? { notes: notes.trim() } : {}
  );
}

export async function rescheduleStaffAppointment(_token: string, appointmentId: number, newDateIso: string) {
  return apiPostAuth<unknown>(`/api/v1/staff/appointments/${appointmentId}/reschedule`, {
    newDate: newDateIso,
  });
}

// Backward compat alias
export const getAppointments = (_token: string) => getStaffAllAppointments(_token);
export const updateAppointmentStatus = (_token: string, _id: number, _status: number) => Promise.resolve({ success: true });

// ─── Staff: Service Records ─────────────────────────────────────────
export interface ServiceRecord {
  serviceRecordId: number;
  appointmentId: number;
  vehicleId?: number;
  vehicleNumber: string;
  customerName: string;
  serviceDescription: string;
  serviceCost: number;
  serviceDate: string;
  status: string;
  reviewRating?: number;
  reviewComment?: string;
  createdAt?: string;
}

function normalizeServiceRecord(raw: unknown): ServiceRecord {
  if (!raw || typeof raw !== "object") {
    return {
      serviceRecordId: 0,
      appointmentId: 0,
      vehicleNumber: "",
      customerName: "",
      serviceDescription: "",
      serviceCost: 0,
      serviceDate: "",
      status: "",
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    serviceRecordId: Number(pick(o, "serviceRecordId", "ServiceRecordId") ?? 0),
    appointmentId: Number(pick(o, "appointmentId", "AppointmentId") ?? 0),
    vehicleId: pick<number>(o, "vehicleId", "VehicleId"),
    vehicleNumber: String(pick(o, "vehicleNumber", "VehicleNumber") ?? ""),
    customerName: String(pick(o, "customerName", "CustomerName") ?? ""),
    serviceDescription: String(pick(o, "serviceDescription", "ServiceDescription") ?? ""),
    serviceCost: Number(pick(o, "serviceCost", "ServiceCost") ?? 0),
    serviceDate: String(pick(o, "serviceDate", "ServiceDate") ?? ""),
    status: String(pick(o, "status", "Status") ?? ""),
    reviewRating: pick<number>(o, "reviewRating", "ReviewRating"),
    reviewComment: pick<string>(o, "reviewComment", "ReviewComment"),
    createdAt: pick<string>(o, "createdAt", "CreatedAt"),
  };
}

export async function getStaffServiceRecords(_token: string, page = 1, pageSize = 20, search?: string) {
  const query = search ? `&search=${encodeURIComponent(search)}` : "";
  const raw = await apiGet<unknown>(`/api/v1/staff/service-records?page=${page}&pageSize=${pageSize}${query}`);
  if (raw && typeof raw === 'object' && 'items' in raw) {
    const o = raw as Record<string, unknown>;
    const listRaw = (o.items as unknown[]) || [];
    return {
      items: listRaw.map(normalizeServiceRecord),
      page: Number(o.page ?? 1),
      pageSize: Number(o.pageSize ?? listRaw.length),
      totalItems: Number(o.totalItems ?? listRaw.length),
      totalPages: Number(o.totalPages ?? 1),
      hasPreviousPage: Boolean(o.hasPreviousPage),
      hasNextPage: Boolean(o.hasNextPage),
    } as PaginatedResponse<ServiceRecord>;
  }
  return {
    items: Array.isArray(raw) ? raw.map(normalizeServiceRecord) : [],
    page: 1, pageSize: 20, totalItems: Array.isArray(raw) ? raw.length : 0, totalPages: 1, hasPreviousPage: false, hasNextPage: false
  };
}

export async function getStaffServiceRecordDetail(_token: string, serviceRecordId: number) {
  const raw = await apiGet<unknown>(`/api/v1/staff/service-records/${serviceRecordId}`);
  return normalizeServiceRecord(raw);
}

export async function createStaffServiceRecord(
  _token: string,
  payload: { appointmentId: number; serviceDescription: string; serviceCost: number }
) {
  // API spec: POST /api/v1/staff/service-records
  // Body: { appointmentId, serviceDescription, serviceCost }
  const { appointmentId, serviceDescription, serviceCost } = payload;
  return apiPostAuth<ServiceRecord>("/api/v1/staff/service-records", { appointmentId, serviceDescription, serviceCost });
}

export async function updateStaffServiceRecord(_token: string, serviceRecordId: number, payload: any) {
  return apiPut<ServiceRecord>(`/api/v1/staff/service-records/${serviceRecordId}`, payload);
}

export async function getStaffMonthlyServiceRecords(_token: string, year: number, month: number) {
  const rows = await apiGet<unknown[]>(`/api/v1/staff/service-records/monthly/${year}/${month}`);
  return rows.map(normalizeServiceRecord);
}

// Backward compat aliases
export const getServiceRecords = (_token: string) => getStaffServiceRecords(_token);
export const createServiceRecord = (_token: string, payload: any) =>
  createStaffServiceRecord(_token, {
    appointmentId: payload.appointmentId,
    serviceDescription: payload.serviceDescription,
    serviceCost: payload.serviceCost,
  });
export const updateServiceRecordStatus = (_token: string, id: number, status: number) =>
  updateStaffServiceRecord(_token, id, {
    status: status === 2 ? "Completed" : "In Progress",
  });

// ─── Staff: Customers ───────────────────────────────────────────────
export interface Customer {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  creditsRemaining: number;
  profileImageUrl?: string;
  createdAt?: string;
  vehicles?: Vehicle[];
  totalSpend?: number;
}

function normalizeStaffVehicle(raw: Record<string, unknown>): Vehicle {
  return {
    vehicleId: Number(pick(raw, "vehicleId", "VehicleId") ?? 0),
    vehicleNumber: String(pick(raw, "vehicleNumber", "VehicleNumber") ?? ""),
    brand: String(pick(raw, "brand", "Brand") ?? ""),
    model: String(pick(raw, "model", "Model") ?? ""),
    year: Number(pick(raw, "year", "Year", "modelYear", "ModelYear") ?? 0),
    imageUrl: pick<string>(raw, "imageUrl", "ImageUrl"),
    createdAt: pick<string>(raw, "createdAt", "CreatedAt"),
  };
}

/** Maps camelCase or PascalCase API rows (e.g. ProfileImageUrl) to Customer. */
function normalizeStaffCustomer(raw: unknown): Customer {
  if (!raw || typeof raw !== "object") {
    return {
      userId: 0,
      fullName: "",
      email: "",
      phone: "",
      creditsRemaining: 0,
    };
  }
  const o = raw as Record<string, unknown>;
  const vehiclesRaw = pick<unknown[]>(o, "vehicles", "Vehicles");
  const img = pick<string>(o, "profileImageUrl", "ProfileImageUrl");
  const trimmed = typeof img === "string" ? img.trim() : "";
  return {
    userId: Number(pick(o, "userId", "UserId") ?? 0),
    fullName: String(pick(o, "fullName", "FullName") ?? ""),
    email: String(pick(o, "email", "Email") ?? ""),
    phone: String(pick(o, "phone", "Phone") ?? ""),
    address: pick<string>(o, "address", "Address"),
    creditsRemaining: Number(pick(o, "creditsRemaining", "CreditsRemaining") ?? 0),
    profileImageUrl: trimmed || undefined,
    createdAt: pick<string>(o, "createdAt", "CreatedAt"),
    vehicles: Array.isArray(vehiclesRaw)
      ? vehiclesRaw.map((v) =>
        v && typeof v === "object" ? normalizeStaffVehicle(v as Record<string, unknown>) : normalizeStaffVehicle({})
      )
      : undefined,
    totalSpend: toOptionalNumber(pick(o, "totalSpend", "TotalSpend")),
  };
}

function normalizePaginatedStaffCustomers(raw: unknown): PaginatedResponse<Customer> {
  if (!raw || typeof raw !== "object") {
    return {
      items: [],
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }
  const o = raw as Record<string, unknown>;
  const listRaw = pick<unknown[]>(o, "items", "Items") ?? [];
  return {
    items: listRaw.map(normalizeStaffCustomer),
    page: Number(pick(o, "page", "Page") ?? 1),
    pageSize: Number(pick(o, "pageSize", "PageSize") ?? listRaw.length),
    totalItems: Number(pick(o, "totalItems", "TotalItems") ?? listRaw.length),
    totalPages: Number(pick(o, "totalPages", "TotalPages") ?? 1),
    hasPreviousPage: Boolean(pick(o, "hasPreviousPage", "HasPreviousPage")),
    hasNextPage: Boolean(pick(o, "hasNextPage", "HasNextPage")),
  };
}

export async function searchStaffCustomers(_token: string, query: string, page = 1, pageSize = 20) {
  if (!query) return getStaffCustomers(_token, page, pageSize);
  const items = await apiGet<unknown[]>(`/api/v1/staff/customers/search?q=${encodeURIComponent(query)}`);
  const normalized = items.map(normalizeStaffCustomer);
  return {
    items: normalized,
    page: 1,
    pageSize: 20,
    totalItems: normalized.length,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  } as PaginatedResponse<Customer>;
}

export async function getStaffCustomers(_token: string, page = 1, pageSize = 20) {
  const raw = await apiGet<unknown>(`/api/v1/staff/customers?page=${page}&pageSize=${pageSize}`);
  return normalizePaginatedStaffCustomers(raw);
}

export async function getStaffCustomerDetail(_token: string, customerId: number) {
  const raw = await apiGet<unknown>(`/api/v1/staff/customers/${customerId}`);
  return normalizeStaffCustomer(raw);
}

export async function createStaffCustomer(_token: string, payload: any) {
  const raw = await apiPostAuth<unknown>("/api/v1/staff/customers", payload);
  return normalizeStaffCustomer(raw);
}

export async function createStaffCustomerVehicle(_token: string, customerId: number, payload: any) {
  const body = {
    ...payload,
    imageUrl: payload?.imageUrl ?? payload?.ImageUrl,
  };
  return apiPostAuth<Vehicle>(`/api/v1/staff/customers/${customerId}/vehicles`, body);
}

/** Rows returned inside customer insights report (flexible API → normalized). */
export interface StaffCustomerReportRow {
  userId: number;
  fullName: string;
  email?: string;
  phone?: string;
  totalSpend?: number;
  totalPurchases?: number;
  visitCount?: number;
  creditsRemaining?: number;
  daysOverdue?: number;
  lastActivity?: string;
}

export interface StaffCustomerInsights {
  topSpenders: StaffCustomerReportRow[];
  regularCustomers: StaffCustomerReportRow[];
  overdueCredits: StaffCustomerReportRow[];
}

function normalizeCustomerReportRow(raw: unknown): StaffCustomerReportRow {
  if (!raw || typeof raw !== "object") {
    return { userId: 0, fullName: "" };
  }
  const o = raw as Record<string, unknown>;
  const uid = Number(pick(o, "userId", "UserId", "customerId", "CustomerId") ?? 0);
  return {
    userId: uid,
    fullName: String(pick(o, "fullName", "FullName", "customerName", "CustomerName") ?? ""),
    email: pick<string>(o, "email", "Email"),
    phone: pick<string>(o, "phone", "Phone"),
    totalSpend: toOptionalNumber(pick(o, "totalSpend", "TotalSpend", "lifetimeSpend", "LifetimeSpend", "totalPurchasesAmount")),
    totalPurchases: toOptionalNumber(pick(o, "totalPurchases", "TotalPurchases", "purchaseCount", "PurchaseCount")),
    visitCount: toOptionalNumber(pick(o, "visitCount", "VisitCount", "appointmentCount")),
    creditsRemaining: toOptionalNumber(pick(o, "creditsRemaining", "CreditsRemaining", "balanceDue", "BalanceDue")),
    daysOverdue: toOptionalNumber(pick(o, "daysOverdue", "DaysOverdue", "overdueDays")),
    lastActivity: pick<string>(o, "lastActivity", "LastActivity", "lastPurchaseDate", "LastPurchaseDate"),
  };
}

function firstArray(o: Record<string, unknown>, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export function normalizeStaffCustomerInsights(data: unknown): StaffCustomerInsights {
  const empty: StaffCustomerInsights = { topSpenders: [], regularCustomers: [], overdueCredits: [] };
  if (!data || typeof data !== "object") return empty;
  const o = data as Record<string, unknown>;
  const mapRows = (arr: unknown[]) => arr.map((r) => normalizeCustomerReportRow(r)).filter((r) => r.userId > 0 || r.fullName);
  return {
    topSpenders: mapRows(firstArray(o, ["topSpenders", "TopSpenders", "highSpenders", "HighSpenders", "topCustomers", "TopCustomers"])),
    regularCustomers: mapRows(
      firstArray(o, ["regularCustomers", "RegularCustomers", "frequentCustomers", "FrequentCustomers", "regulars", "Regulars"])
    ),
    overdueCredits: mapRows(
      firstArray(o, ["overdueCredits", "OverdueCredits", "pendingCredits", "PendingCredits", "customersWithOverdue", "overdueBalances"])
    ),
  };
}

export async function getStaffCustomerReports(_token: string): Promise<StaffCustomerInsights> {
  const data = await apiGet<unknown>("/api/v1/staff/customers/reports");
  return normalizeStaffCustomerInsights(data);
}

// Backward compat aliases
export const getCustomers = (_token: string) => searchStaffCustomers(_token, "");
export const createCustomer = (_token: string, payload: any) => createStaffCustomer(_token, payload);
export const updateCustomer = (_token: string, _userId: number, payload: any) => Promise.resolve({ ...payload, userId: _userId }) as Promise<any>;
export const deleteCustomer = (_token: string, _userId: number) => Promise.resolve({ success: true });

// ─── Staff: Sales Invoices ──────────────────────────────────────────
export interface SalesInvoiceItem {
  partId: number;
  partName?: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice?: number;
}

export interface SalesInvoice {
  salesInvoiceId: number;
  customerId: number;
  customerName?: string;
  vehicleId: number;
  vehicleNumber?: string;
  invoiceDate: string;
  subTotal: number;
  serviceCharge: number;
  discountAmount: number;
  finalAmount: number;
  isPaid: boolean;
  dueDate: string;
  items?: SalesInvoiceItem[];
  /** When API returns visit linkage */
  appointmentId?: number;
  invoiceType?: string;
}

export type CreateStaffInvoicePayload = {
  customerId: number;
  vehicleId: number;
  isPaid: boolean;
  dueDate: string;
  items: { partId: number; quantity: number; pricePerUnit: number }[];
  discountAmount?: number;
  serviceCharge?: number;
  appointmentId?: number;
  /** Parts-only vs visit-based billing (backend may ignore if unsupported) */
  invoiceType?: "Parts" | "Appointment";
};

export async function getStaffInvoices(_token: string, page = 1, pageSize = 20, search?: string) {
  const query = search ? `&search=${encodeURIComponent(search)}` : "";
  return apiGet<PaginatedResponse<SalesInvoice>>(`/api/v1/staff/sales-invoices?page=${page}&pageSize=${pageSize}${query}`);
}

export async function getStaffInvoiceDetail(_token: string, invoiceId: number) {
  return apiGet<SalesInvoice>(`/api/v1/staff/sales-invoices/${invoiceId}`);
}

export async function createStaffInvoice(_token: string, payload: CreateStaffInvoicePayload) {
  const body: Record<string, unknown> = {
    customerId: payload.customerId,
    vehicleId: payload.vehicleId,
    isPaid: payload.isPaid,
    dueDate: payload.dueDate,
    items: payload.items,
  };
  if (payload.discountAmount != null && Number(payload.discountAmount) > 0) {
    body.discountAmount = Number(payload.discountAmount);
  }
  if (payload.appointmentId != null && payload.appointmentId > 0) {
    body.appointmentId = payload.appointmentId;
  }
  if (payload.invoiceType) {
    body.invoiceType = payload.invoiceType;
  }
  return apiPostAuth<SalesInvoice>("/api/v1/staff/sales-invoices", body);
}

export async function markStaffInvoicePaid(_token: string, invoiceId: number) {
  return apiPatch<any>(`/api/v1/staff/sales-invoices/${invoiceId}/pay`);
}

export async function emailStaffInvoice(_token: string, invoiceId: number) {
  return apiPostAuth<any>(`/api/v1/staff/sales-invoices/${invoiceId}/email`);
}

// Backward compat aliases
export const getInvoices = (_token: string) => getStaffInvoices(_token);
export const createInvoice = (_token: string, payload: any) =>
  createStaffInvoice(_token, {
    customerId: payload.customerId,
    vehicleId: payload.vehicleId,
    isPaid: payload.isPaid ?? false,
    dueDate: payload.dueDate,
    discountAmount: payload.discountAmount,
    appointmentId: payload.appointmentId,
    invoiceType: payload.invoiceType,
    items: (payload.items || []).map((item: any) => ({
      partId: item.partId,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
    })),
  });
export const updateInvoiceStatus = (_token: string, invoiceId: number, _isPaid: boolean) => markStaffInvoicePaid(_token, invoiceId);
export const emailInvoice = (_token: string, invoiceId: number) => emailStaffInvoice(_token, invoiceId);

// ─── Staff: Profile ─────────────────────────────────────────────────
export async function getStaffProfile(_token: string) {
  return apiGet<any>("/api/v1/staff/profile");
}

export async function updateStaffProfile(_token: string, payload: any) {
  return apiPut<any>("/api/v1/staff/profile", payload);
}

// ─── Staff: Reports ─────────────────────────────────────────────────
export async function getStaffPerformanceReport(_token: string) {
  return apiGet<any>("/api/v1/staff/reports/performance");
}

export async function getStaffMonthlyReport(_token: string, year: number, month: number) {
  return apiGet<any>(`/api/v1/staff/reports/monthly/${year}/${month}`);
}

// ─── Vehicles (staff-scoped, kept for staff pages) ──────────────────
export async function getStaffVehicles(_token: string, query?: string) {
  const q = query?.trim();
  const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiGet<Array<Vehicle & { customerName?: string; customerPhone?: string; status?: string; lastServiceDate?: string }>>(
    `/api/v1/staff/vehicles${suffix}`
  );
}

export async function getStaffVehicleDetail(_token: string, vehicleId: number) {
  return apiGet<Vehicle & {
    customerName?: string;
    customerPhone?: string;
    status?: string;
    lastServiceDate?: string;
    appointments?: StaffAppointment[];
    serviceRecords?: ServiceRecord[];
    invoices?: SalesInvoice[];
  }>(`/api/v1/staff/vehicles/${vehicleId}`);
}

export async function getVehicles(_token: string) {
  return getStaffVehicles(_token);
}

export async function getVehiclesByCustomerId(_token: string, customerId: number) {
  const customer = await getStaffCustomerDetail(_token, customerId);
  return customer.vehicles || [];
}
