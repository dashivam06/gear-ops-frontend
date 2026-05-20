"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { useAuthStore, deriveUserFromToken } from "@/lib/store/auth-store";

type LoginPayload = { email: string; password: string };
type RequestOtpPayload = { email: string };
type VerifyOtpPayload = { verificationId: string; otp: string };
type SignupPayload = {
  verificationId: string;
  fullName: string;
  email?: string;
  password: string;
  confirmPassword: string;
  profileImageUrl: string;
  phone: string;
  address: string;
  emailSubscribed: boolean;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  userProfile?: {
    userId?: number;
    fullName?: string;
    email?: string;
    role?: string; // "Customer" | "Staff" | "Admin"
    profileImageUrl?: string;
  };
};

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await apiPost<AuthResponse>("/api/v1/auth/login", payload);
      return response.data;
    },
    onSuccess: (data) => {
      const derived = deriveUserFromToken(data.accessToken);
      const user = {
        userId: data.userProfile?.userId ?? derived?.userId,
        fullName: data.userProfile?.fullName ?? derived?.fullName,
        email: data.userProfile?.email ?? derived?.email,
        role: data.userProfile?.role ?? derived?.role,
        profileImageUrl: data.userProfile?.profileImageUrl ?? derived?.profileImageUrl,
      };
      setSession(data.accessToken, data.refreshToken, user);
      return data;
    }
  });
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: async (payload: RequestOtpPayload) => {
      const response = await apiPost<{ verificationId: string }>(
        "/api/v1/auth/request-otp",
        payload
      );
      return response.data;
    }
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: VerifyOtpPayload) => {
      const response = await apiPost<{ verified: boolean }>(
        "/api/v1/auth/verify-otp",
        payload
      );
      return response.data;
    }
  });
}

export function useSignup() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const response = await apiPost<AuthResponse>("/api/v1/auth/register", payload);
      return response.data;
    },
    onSuccess: (data) => {
      const derived = deriveUserFromToken(data.accessToken);
      const user = {
        userId: data.userProfile?.userId ?? derived?.userId,
        fullName: data.userProfile?.fullName ?? derived?.fullName,
        email: data.userProfile?.email ?? derived?.email,
        role: data.userProfile?.role ?? derived?.role,
        profileImageUrl: data.userProfile?.profileImageUrl ?? derived?.profileImageUrl,
      };
      setSession(data.accessToken, data.refreshToken, user);
      return data;
    }
  });
}

export function useGoogleSignup() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async () => ({ accessToken: `mock_access_${Date.now()}` }),
    onSuccess: (data) =>
      setSession(data.accessToken, "mock_refresh_token", {
        fullName: "Admin User",
        email: "admin@gearops.com",
        role: "Admin",
      })
  });
}

// Frontend-only: same mock behavior as Google signup.
export function useGoogleLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async () => ({ accessToken: `mock_access_${Date.now()}` }),
    onSuccess: (data) =>
      setSession(data.accessToken, "mock_refresh_token", {
        fullName: "Admin User",
        email: "admin@gearops.com",
        role: "Admin",
      })
  });
}
