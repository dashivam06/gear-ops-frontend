"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { verifyPasswordResetOtp } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Loader2, ArrowLeft } from "lucide-react";

function VerifyPasswordResetOtpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVerificationId = searchParams?.get("verificationId") ?? "";
  const { addToast } = useToast();

  const [verificationId, setVerificationId] = useState(initialVerificationId);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!verificationId) return setError("Missing verification id");
    if (!otp) return setError("Enter the OTP");
    setLoading(true);
    try {
      const res = await verifyPasswordResetOtp(verificationId, otp);
      addToast({ title: res.message ?? "OTP verified", variant: "success", duration: 2000 });
      router.push(`/login/forgot/reset?verificationId=${verificationId}`);
    } catch (err) {
      setError((err as Error)?.message ?? "Verification failed");
      addToast({ title: "OTP verification failed", description: (err as Error)?.message ?? undefined, variant: "error", duration: 3500 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 bg-[#0e0e10] px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black font-montserrat">
      <div className="flex items-center justify-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/corerouter-logo.png"
            alt="Vehicle"
            width={52}
            height={52}
            priority
            className="h-[3.25rem] w-[3.25rem] object-contain"
          />
          <span className="font-montserrat text-[22px] font-bold tracking-[0.08em] text-white">
            GEAR OPS
          </span>
        </Link>
      </div>

      <div className="w-full max-w-[420px]">
        <section className="rounded-sm border border-zinc-200 bg-white p-8">
          <div className="mb-6">
            <Link 
              href="/login/forgot/request" 
              className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950"
            >
              <ArrowLeft className="size-4" />
              Back
            </Link>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Verify OTP</h2>
            <p className="mt-1 text-sm text-zinc-500">Enter the code sent to your email.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <FormField id="fp-verification" label="Verification ID" value={verificationId} onChange={(e) => setVerificationId(e.target.value)} />
            <FormField id="fp-otp" label="OTP Code" placeholder="Enter 6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Verify OTP"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function VerifyPasswordResetOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPasswordResetOtpInner />
    </Suspense>
  );
}
