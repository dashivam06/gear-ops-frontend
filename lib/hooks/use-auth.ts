"use client";

import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";

type LoginPayload = { email: string; password: string };
type RequestOtpPayload = { email: string };
type VerifyOtpPayload = { verificationId: string; otp: string };
type SignupPayload = {
  verificationId: string;
  fullName: string;
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
  userProfile: {
    fullName: string;
    email: string;
    role: number;
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
    onSuccess: (data) => setSession(data.accessToken, data.userProfile)
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
    onSuccess: (data) => setSession(data.accessToken, data.userProfile)
  });
}

export function useGoogleSignup() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async () => ({ accessToken: `mock_access_${Date.now()}` }),
    onSuccess: (data) =>
      setSession(data.accessToken, {
        fullName: "Admin User",
        email: "admin@gearops.com"
      })
  });
}

// Frontend-only: same mock behavior as Google signup.
export function useGoogleLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async () => ({ accessToken: `mock_access_${Date.now()}` }),
    onSuccess: (data) =>
      setSession(data.accessToken, {
        fullName: "Admin User",
        email: "admin@gearops.com"
      })
  });
}
