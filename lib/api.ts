const API_BASE_URL = "http://localhost:7777";

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiPost<T>(path: string, body?: unknown) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    const message = json?.message ?? "Request failed";
    throw new Error(message);
  }

  if (!json) {
    throw new Error("Invalid server response");
  }

  return json;
}

export async function logoutAuth() {
  await apiPost<void>("/api/v1/auth/logout");
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
