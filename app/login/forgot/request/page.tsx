"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordRequestPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) return setError("Please enter your email");

    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      addToast({ 
        title: "Reset OTP Sent", 
        description: "Check your email for the verification code.",
        variant: "success", 
        duration: 3000 
      });
      router.push(`/login/forgot/verify?verificationId=${res.data.verificationId}`);
    } catch (err) {
      setError((err as Error)?.message ?? "Something went wrong");
      addToast({ 
        title: "Request failed", 
        description: (err as Error)?.message ?? undefined, 
        variant: "error", 
        duration: 4000 
      });
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
              href="/login" 
              className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-950"
            >
              <ArrowLeft className="size-4" />
              Back to login
            </Link>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Forgot password?</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Enter your email address and we&apos;ll send you a code to reset your password.
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <FormField 
              id="fp-email" 
              label="Email Address" 
              type="email"
              placeholder="you@example.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Send Reset Code"}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
