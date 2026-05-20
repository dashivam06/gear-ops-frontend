const ACCESS_TOKEN_COOKIE = "accessToken";

// ─── Access Token Cookie ────────────────────────────────────────────
export function setAccessTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  // Session cookie (no max-age = cleared when browser closes)
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${token}; path=/; SameSite=Lax`;
}

export function getAccessTokenCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${ACCESS_TOKEN_COOKIE}=([^;]+)`));
  return match ? match[2] : null;
}

export function clearAccessTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ─── Refresh Token (localStorage) ───────────────────────────────────
export function setRefreshTokenStorage(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("refreshToken", token);
  }
}

export function getRefreshTokenStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("refreshToken");
}

export function clearRefreshTokenStorage() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("refreshToken");
  }
}

// ─── Profile (localStorage) ─────────────────────────────────────────
export function clearAuthProfileStorage() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("auth.user");
  }
}

export function clearAuthTokenStorage() {
  // Clear both legacy localStorage and cookie
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("auth.accessToken");
  }
  clearAccessTokenCookie();
  clearRefreshTokenStorage();
}

export function setAuthProfileStorage(profile: any) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("auth.user", JSON.stringify(profile));
  }
}

// ─── Refresh Token Cookie (Legacy/Cleanup) ──────────────────────────
export function clearRefreshTokenCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }
}

export function getRefreshTokenCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^| )refreshToken=([^;]+)/);
  return match ? match[2] : null;
}
