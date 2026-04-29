"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLogin } from "@/lib/hooks/use-auth";
import { useGoogleLogin } from "@/lib/hooks/use-auth";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#EA4335"
        d="M12 10.2v3.95h5.53c-.24 1.24-1.35 3.63-5.53 3.63-3.33 0-6.05-2.76-6.05-6.16S8.67 5.47 12 5.47c1.9 0 3.17.81 3.9 1.5l2.65-2.55C16.84 3.06 14.68 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.76 0 9.58-4.05 9.58-9.76 0-.66-.07-1.16-.15-1.64H12Z"
      />
      <path
        fill="#FBBC05"
        d="M3.66 7.16 6.7 9.38C7.52 7.36 9.58 5.47 12 5.47c1.9 0 3.17.81 3.9 1.5l2.65-2.55C16.84 3.06 14.68 2 12 2 8.1 2 4.77 4.27 3.66 7.16Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.64 0 4.86-.87 6.48-2.38l-3.01-2.46c-.81.56-1.9.95-3.47.95-4.17 0-5.28-2.39-5.53-3.62H3.02C4.34 19.57 7.66 22 12 22Z"
      />
      <path
        fill="#4285F4"
        d="M21.58 12.24c0-.66-.07-1.16-.15-1.64H12v3.95h5.53c-.25 1.24-1.36 3.63-5.53 3.63v3.84c5.76 0 9.58-4.05 9.58-9.78Z"
      />
    </svg>
  );
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

type LoginValues = z.infer<typeof loginSchema>;

const resetSchema = z.object({
  email: z.string().email("Enter a valid email")
});

type ResetValues = z.infer<typeof resetSchema>;

const labelAuth =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";

const inputCls =
  "w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-poppins";

const primaryBtnCls =
  "w-full rounded-sm bg-zinc-950 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();

  const [showReset, setShowReset] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "pending" | "sent">("idle");

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors }
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" }
  });

  const onSubmit = (values: LoginValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        router.push("/dashboard");
      }
    });
  };

  const onResetSubmit = (_values: ResetValues) => {
    setResetStatus("pending");
    window.setTimeout(() => {
      setResetStatus("sent");
      setShowReset(false);
    }, 800);
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

      <div className="w-full max-w-[400px]">
        <section className="rounded-sm border border-zinc-200 bg-white p-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Log in</h2>
            <p className="mt-1 text-sm text-zinc-500">Use your email and password to continue.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label className={labelAuth} htmlFor="login-email">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="you@example.com"
                className={inputCls}
                {...register("email")}
              />
              {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
            </div>

            <div className="space-y-1.5">
              <label className={labelAuth} htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                placeholder="Enter your password"
                className={inputCls}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              ) : null}
            </div>

            <button type="submit" disabled={loginMutation.isPending} className={primaryBtnCls}>
              {loginMutation.isPending ? (
                <Loader2 className="mx-auto size-4 animate-spin" />
              ) : (
                "Log in"
              )}
            </button>

            <button
              type="button"
              disabled={googleLoginMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              onClick={() => {
                googleLoginMutation.mutate(undefined, {
                  onSuccess: () => {
                    router.push("/dashboard");
                  }
                });
              }}
            >
              {googleLoginMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleIcon className="size-4" />
              )}
              {googleLoginMutation.isPending ? "Connecting..." : "Log in with Google"}
            </button>

            <div className="pt-1">
              <button
                type="button"
                className="text-sm font-semibold text-zinc-900 hover:underline"
                onClick={() => {
                  setResetStatus("idle");
                  setShowReset((v) => !v);
                }}
              >
                Forgot password?
              </button>
            </div>
          </form>

          {showReset ? (
            <div className="mt-4 rounded-sm border border-zinc-200 bg-zinc-50 p-4">
              {resetStatus === "sent" ? (
                <p className="text-sm text-zinc-700">Reset link sent to your email.</p>
              ) : (
                <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className={labelAuth} htmlFor="reset-email">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className={inputCls}
                      {...registerReset("email")}
                    />
                    {resetErrors.email ? (
                      <p className="text-sm text-red-600">{resetErrors.email.message}</p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    disabled={resetStatus === "pending"}
                    className={primaryBtnCls}
                  >
                    {resetStatus === "pending" ? (
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
            <span className="whitespace-nowrap text-xs text-zinc-400">Have an account?</span>
            <Link href="/signup" className="whitespace-nowrap text-xs font-semibold text-zinc-950 hover:underline">
              Sign up
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
