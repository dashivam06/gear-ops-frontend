"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword
} from "@/lib/api";
import { useSignup } from "@/lib/hooks/use-auth";

// mode: "reset" | "register"
export function ThreePhaseAuthFlow({ mode = "reset" }: { mode: "reset" | "register" }) {
  const router = useRouter();
  const { addToast } = useToast();
  const signupMutation = useSignup();

  // Step: 0=email, 1=otp, 2=profile/password
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile fields (for registration)
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 0: Request OTP
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res;
      if (mode === "reset") {
        res = await requestPasswordReset(email);
      } else {
        // For registration, you may want to call a different endpoint if needed
        res = await requestPasswordReset(email); // fallback to same for demo
      }
      setVerificationId(res.data.verificationId);
      addToast({ title: res.message ?? "OTP sent", variant: "success" });
      setStep(1);
    } catch (err) {
      setError((err as Error)?.message ?? "Failed to send OTP");
      addToast({ title: "Failed to send OTP", description: (err as Error)?.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Verify OTP
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verifyPasswordResetOtp(verificationId, otp);
      if (res.data.verified) {
        addToast({ title: res.message ?? "OTP verified", variant: "success" });
        setStep(2);
      } else {
        setError("Invalid OTP");
      }
    } catch (err) {
      setError((err as Error)?.message ?? "OTP verification failed");
      addToast({ title: "OTP verification failed", description: (err as Error)?.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Set password (and profile for register)
  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "reset") {
        const res = await resetPassword(verificationId, password, confirmPassword);
        addToast({ title: res.message ?? "Password reset successful", variant: "success" });
        setTimeout(() => router.push("/login"), 900);
      } else {
        // Registration: call signup mutation
        await signupMutation.mutateAsync({
          verificationId,
          fullName,
          password,
          confirmPassword,
          profileImageUrl: "",
          phone: "",
          address: "",
          emailSubscribed: true
        });
        addToast({ title: "Registration successful", variant: "success" });
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch (err) {
      setError((err as Error)?.message ?? "Failed");
      addToast({ title: "Failed", description: (err as Error)?.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {step === 0 && (
        <form className="space-y-4" onSubmit={handleRequest}>
          <h2 className="text-xl font-semibold text-zinc-950 mb-2">
            {mode === "reset" ? "Forgot password" : "Register account"}
          </h2>
          <FormField id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Send OTP"}</Button>
        </form>
      )}
      {step === 1 && (
        <form className="space-y-4" onSubmit={handleVerify}>
          <h2 className="text-xl font-semibold text-zinc-950 mb-2">Enter OTP</h2>
          <FormField id="otp" label="OTP code" value={otp} onChange={e => setOtp(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Verify OTP"}</Button>
        </form>
      )}
      {step === 2 && (
        <form className="space-y-4" onSubmit={handleComplete}>
          <h2 className="text-xl font-semibold text-zinc-950 mb-2">
            {mode === "reset" ? "Set new password" : "Complete your profile"}
          </h2>
          {mode === "register" && (
            <FormField id="fullName" label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
          )}
          <FormField id="password" label="New password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <FormField id="confirmPassword" label="Confirm password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : (mode === "reset" ? "Set password" : "Register")}</Button>
        </form>
      )}
    </div>
  );
}
