import { create } from "zustand";

type UserProfile = {
  fullName?: string;
  email?: string;
  role?: number;
  profileImageUrl?: string;
};

interface AuthState {
  accessToken: string | null;
  user: UserProfile | null;
  setSession: (token: string | null, user?: UserProfile | null) => void;
  clearSession: () => void;
  hydrateFromStorage: () => void;
}

const ACCESS_TOKEN_KEY = "auth.accessToken";
const USER_KEY = "auth.user";

function decodeJwt(token: string): Record<string, unknown> | null {
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

function deriveUserFromToken(token: string): UserProfile | null {
  const payload = decodeJwt(token);
  if (!payload) return null;

  const fullName =
    (payload.fullName as string | undefined) ||
    (payload.full_name as string | undefined) ||
    (payload.name as string | undefined);
  const email =
    (payload.email as string | undefined) ||
    (payload.user_email as string | undefined);
  const role = payload.role as number | undefined;
  const profileImageUrl =
    (payload.profileImageUrl as string | undefined) ||
    (payload.profile_image as string | undefined) ||
    (payload.avatar as string | undefined) ||
    (payload.image as string | undefined);

  if (!fullName && !email && !profileImageUrl) return null;
  return { fullName, email, role, profileImageUrl };
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (token, user) => {
    set({ accessToken: token, user: user ?? null });
    if (typeof window === "undefined") return;
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  },
  clearSession: () => {
    set({ accessToken: null, user: null });
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const userRaw = window.localStorage.getItem(USER_KEY);
    let user: UserProfile | null = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as UserProfile;
      } catch {
        user = null;
      }
    }
    if (!user && token) {
      user = deriveUserFromToken(token);
    }
    set({ accessToken: token, user });
  }
}));
