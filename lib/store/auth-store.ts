import { create } from "zustand";
import { setAccessTokenCookie, getAccessTokenCookie, clearAccessTokenCookie, setRefreshTokenStorage, getRefreshTokenStorage, clearRefreshTokenStorage } from "@/lib/auth";

type UserProfile = {
  userId?: number;
  fullName?: string;
  email?: string;
  role?: string; // "Customer" | "Staff" | "Admin"
  profileImageUrl?: string;
  phone?: string;
  address?: string;
  position?: string;
  joinDate?: string;
  status?: string;
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  hasHydrated: boolean;
  setSession: (accessToken: string | null, refreshToken: string | null, user?: UserProfile | null) => void;
  clearSession: () => void;
  setUser: (user: UserProfile | null) => void;
  hydrateFromStorage: () => void;
}

const USER_KEY = "auth.user";

export function decodeJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  try {
    const decoded = atob(payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "="));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickRoleClaim(payload: Record<string, unknown>): unknown {
  const msRole = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  return (
    payload.role ??
    payload.Role ??
    payload.user_role ??
    payload.UserRole ??
    payload.userRole ??
    msRole
  );
}

export function deriveUserFromToken(token: string): UserProfile | null {
  const payload = decodeJwt(token);
  if (!payload) return null;

  const userId =
    (payload.nameid as number | string | undefined) ??
    (payload.sub as number | string | undefined);
  const fullName =
    (payload.fullName as string | undefined) ||
    (payload.full_name as string | undefined) ||
    (payload.name as string | undefined);
  const email =
    (payload.email as string | undefined) ||
    (payload.user_email as string | undefined);

  // Role can be string ("Customer", "Staff", "Admin") or number
  let role: string | undefined;
  const rawRole = pickRoleClaim(payload);

  if (typeof rawRole === "string") {
    role = rawRole.trim();
  } else if (typeof rawRole === "number") {
    // Legacy numeric mapping
    if (rawRole === 1) role = "Admin";
    else if (rawRole === 2) role = "Staff";
    else role = "Customer";
  } else if (Array.isArray(rawRole) && rawRole.length > 0) {
    role = String(rawRole[0]).trim();
  }

  const profileImageUrl =
    (payload.profileImageUrl as string | undefined) ||
    (payload.ProfileImageUrl as string | undefined) ||
    (payload.profile_image as string | undefined) ||
    (payload.avatar as string | undefined) ||
    (payload.image as string | undefined);

  if (!userId && !email && !role) return null; // We must have at least one identifier or role

  return {
    userId: userId ? Number(userId) : undefined,
    fullName,
    email,
    role,
    profileImageUrl,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hasHydrated: false,
  setSession: (accessToken, refreshToken, user) => {
    set({ accessToken, refreshToken, user: user ?? null, hasHydrated: true });
    if (typeof window === "undefined") return;
    
    // Save access token in cookie and localStorage
    if (accessToken) {
      setAccessTokenCookie(accessToken);
      window.localStorage.setItem("auth.accessToken", accessToken);
    } else {
      clearAccessTokenCookie();
      window.localStorage.removeItem("auth.accessToken");
    }
    
    // Save refresh token in local storage
    if (refreshToken) {
      setRefreshTokenStorage(refreshToken);
    } else {
      clearRefreshTokenStorage();
    }

    // Save user profile in localStorage
    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  },
  setUser: (user) => {
    set({ user });
    if (typeof window !== "undefined" && user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },
  clearSession: () => {
    set({ accessToken: null, refreshToken: null, user: null });
    if (typeof window === "undefined") return;
    clearAccessTokenCookie();
    clearRefreshTokenStorage();
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem("auth.accessToken");
  },
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    // Read access token from cookie
    let accessToken = getAccessTokenCookie();
    if (!accessToken) {
      accessToken = window.localStorage.getItem("auth.accessToken");
    }
    // Read refresh token from local storage
    const refreshToken = getRefreshTokenStorage();
    const userRaw = window.localStorage.getItem(USER_KEY);
    let user: UserProfile | null = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as UserProfile;
      } catch {
        user = null;
      }
    }
    // Merge JWT claims so role/userId stay correct even if localStorage snapshot is stale
    if (accessToken) {
      const fromJwt = deriveUserFromToken(accessToken);
      if (fromJwt) {
        user = {
          ...fromJwt,
          ...(user || {}),
          role: fromJwt.role ?? user?.role,
          userId: fromJwt.userId ?? user?.userId,
          email: user?.email ?? fromJwt.email,
          fullName: user?.fullName ?? fromJwt.fullName,
          profileImageUrl: user?.profileImageUrl ?? fromJwt.profileImageUrl,
        };
      }
    }
    set({ accessToken, refreshToken, user, hasHydrated: true });
  }
}));
