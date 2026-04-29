"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Loader2 } from "lucide-react";
import {
  useGoogleSignup,
  useRequestOtp,
  useSignup,
  useVerifyOtp
} from "@/lib/hooks/use-auth";

type Step = "email" | "otp" | "profile";

const labelAuth =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const labelDark =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const otpBox =
  "h-14 w-12 rounded-sm border border-[#474747] bg-[#1c1b1d] text-center text-lg text-white outline-none focus:border-white font-poppins";

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

function StepDots({
  step,
  compact = false
}: {
  step: Step;
  compact?: boolean;
}) {
  const idx = step === "email" ? 0 : step === "otp" ? 1 : 2;
  return (
    <div
      className={`${compact ? "mb-5" : "mb-10"} flex items-center justify-center gap-2`}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${
            i <= idx ? "bg-white" : "bg-[#474747]"
          }`}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const signupMutation = useSignup();
  const googleSignupMutation = useGoogleSignup();
  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");

  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [subscribeMarketing, setSubscribeMarketing] = useState(true);

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [resendSecs, setResendSecs] = useState(0);
  const [profileTtlSecs, setProfileTtlSecs] = useState(0);

  useEffect(() => {
    if (resendSecs <= 0) return;
    const t = window.setInterval(() => setResendSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [resendSecs]);

  useEffect(() => {
    if (profileTtlSecs <= 0) return;
    const t = window.setInterval(() => {
      setProfileTtlSecs((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [profileTtlSecs]);

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
    };
  }, [profileImagePreview]);

  function onOtpChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function validateEmail(input: string) {
    const s = input.trim();
    return /^\S+@\S+\.\S+$/.test(s);
  }

  function validatePhone(input: string) {
    return /^\+?[0-9]{7,15}$/.test(input.trim());
  }

  function getErrorMessage(err: unknown) {
    return err instanceof Error ? err.message : "Request failed.";
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    setLoading(true);

    const trimmed = email.trim();

    try {
      const data = await requestOtpMutation.mutateAsync({ email: trimmed });
      setVerificationId(data.verificationId ?? "");
      setResendSecs(45);
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function onGoogleCreate() {
    setFieldErrors({});
    setError(null);
    setSocialLoading("google");

    googleSignupMutation.mutate(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
      onError: () => {
        setSocialLoading(null);
        setError("Could not sign up with Google.");
      },
      onSettled: () => setSocialLoading(null)
    });
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();

    if (!verificationId) {
      setError("Please request a new OTP code.");
      setStep("email");
      return;
    }

    const code = otp.join("");

    setFieldErrors({});
    setError(null);
    setLoading(true);

    try {
      const data = await verifyOtpMutation.mutateAsync({
        verificationId,
        otp: code
      });
      if (!data.verified) {
        setError("Invalid code.");
        return;
      }
      setProfileTtlSecs(10 * 60);
      setStep("profile");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendSecs > 0) return;
    setError(null);
    setFieldErrors({});

    const trimmed = email.trim();
    if (!validateEmail(trimmed)) {
      setFieldErrors({ email: "Please enter a valid email." });
      return;
    }

    setLoading(true);
    try {
      const data = await requestOtpMutation.mutateAsync({ email: trimmed });
      if (data.verificationId) setVerificationId(data.verificationId);
      setResendSecs(45);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function onProfileImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setError(null);

    setProfilePhotoFile(file);
    setProfileImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function onComplete(e: FormEvent) {
    e.preventDefault();

    setFieldErrors({});
    setError(null);

    if (!subscribeMarketing) {
      setError("Please enable the consent to create your account.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!verificationId) {
      setError("Session expired. Please restart registration.");
      setStep("email");
      return;
    }

    if (!profilePhotoFile) {
      setError("Please upload a profile photo.");
      return;
    }

    const fullNameTrim = fullName.trim();
    const addressTrim = address.trim();
    const phoneTrim = phone.trim();

    if (fullNameTrim.length < 2) {
      setFieldErrors({ fullName: "Enter your full name." });
      return;
    }
    if (addressTrim.length < 3) {
      setFieldErrors({ address: "Enter your address." });
      return;
    }
    if (!validatePhone(phoneTrim)) {
      setFieldErrors({ phone: "Enter a valid phone number." });
      return;
    }

    setLoading(true);

    const profileImageUrl = profileImagePreview ?? "";

    signupMutation.mutate(
      {
        verificationId,
        fullName: fullNameTrim,
        password,
        confirmPassword: confirm,
        profileImageUrl,
        phone: phoneTrim,
        address: addressTrim,
        emailSubscribed: subscribeMarketing
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
        onError: (err) => {
          setError(getErrorMessage(err));
        },
        onSettled: () => setLoading(false)
      }
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 bg-[#0e0e10] px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black font-montserrat">
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/corerouter-logo.png"
              alt="CoreRouter"
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

        <div
          className={`w-full ${step === "profile" ? "max-w-[560px]" : "max-w-[400px]"}`}
        >
          {step === "email" ? (
            <section className="rounded-sm border border-zinc-200 bg-white p-8">
              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                  Create account
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Enter your work email to get started.
                </p>
              </div>

              <form className="space-y-4" onSubmit={onEmail}>
                <div className="space-y-1.5">
                  <label className={labelAuth} htmlFor="reg-email">
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-poppins"
                  />
                  {fieldErrors.email ? (
                    <p className="text-sm text-red-600">{fieldErrors.email}</p>
                  ) : null}
                </div>

                {error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-sm bg-zinc-950 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="mx-auto size-4 animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={onGoogleCreate}
                  disabled={socialLoading !== null || googleSignupMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  {socialLoading === "google" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="size-4" />
                  )}
                  <span>Google</span>
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
                <span className="whitespace-nowrap text-xs text-zinc-400">
                  Have an account?
                </span>
                <Link
                  href="/login"
                  className="whitespace-nowrap text-xs font-semibold text-zinc-950 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </section>
          ) : null}

          {step === "otp" ? (
            <section className="overflow-hidden rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
              <StepDots step="otp" />

              <div className="mb-8 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Verify email
                </h2>
                <p className="mt-1 text-sm text-[#c6c6c6]">
                  We&apos;ve sent a code to your inbox
                </p>
              </div>

              <form className="space-y-8" onSubmit={onVerifyOtp}>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      className={otpBox}
                      maxLength={1}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={digit}
                      onChange={(e) => onOtpChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !otp[i] && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                    />
                  ))}
                </div>

                {error ? (
                  <p className="text-center text-sm text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-sm bg-white py-3 font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="mx-auto size-4 animate-spin text-zinc-950" />
                    ) : (
                      "Verify Code"
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={resendSecs > 0 || loading}
                    className="w-full text-xs font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                    onClick={onResend}
                  >
                    {resendSecs > 0
                      ? `Resend code (${resendSecs}s)`
                      : "Resend code"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {step === "profile" ? (
            <section className="rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
              <StepDots step="profile" compact />

              <div className="mb-5">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Complete Profile
                </h2>
                <p className="mt-1 text-sm text-[#c6c6c6]">Setup your architect credentials</p>
              </div>

              <form className="space-y-5" onSubmit={onComplete}>
                {profileTtlSecs > 0 ? (
                  <p className="text-xs text-zinc-400">
                    Complete registration in {Math.floor(profileTtlSecs / 60)}:
                    {(profileTtlSecs % 60).toString().padStart(2, "0")}
                  </p>
                ) : null}

                <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className={labelDark} htmlFor="verified-email">
                      Verified Email
                    </label>
                    <div
                      id="verified-email"
                      aria-disabled="true"
                      className="w-full cursor-not-allowed rounded-sm border border-[#474747] bg-[#18181a] px-4 py-3 opacity-80"
                    >
                      <p className="truncate font-poppins text-zinc-400">{email}</p>
                    </div>
                  </div>

                  <div className="row-span-2 flex shrink-0 flex-col items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      className="relative rounded-full"
                      aria-label="Upload profile image"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          profileImagePreview ||
                          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                            (fullName || email || "User").trim()
                          )}`
                        }
                        alt="Profile preview"
                        className="size-24 shrink-0 rounded-full border border-[#474747] bg-[#1c1b1d] object-cover"
                      />
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-[#1c1b1d] bg-white text-xs font-bold text-zinc-900">
                        +
                      </span>
                    </button>
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onProfileImageChange}
                    />
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                      Profile image
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelDark} htmlFor="full-name">
                      Full Name
                    </label>
                    <input
                      id="full-name"
                      required
                      placeholder="John Architect"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                    />
                    {fieldErrors.fullName ? (
                      <p className="text-sm text-red-400">{fieldErrors.fullName}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelDark} htmlFor="address">
                      Address
                    </label>
                    <input
                      id="address"
                      required
                      placeholder="Street, City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                    />
                    {fieldErrors.address ? (
                      <p className="text-sm text-red-400">{fieldErrors.address}</p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelDark} htmlFor="phone">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      required
                      placeholder="+1 5551234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                    />
                    {fieldErrors.phone ? (
                      <p className="text-sm text-red-400">{fieldErrors.phone}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelDark} htmlFor="pw">
                    Create Password
                  </label>
                  <input
                    id="pw"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelDark} htmlFor="pw2">
                    Confirm Password
                  </label>
                  <input
                    id="pw2"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-sm border border-[#474747] bg-[#1c1b1d] p-3">
                  <input
                    type="checkbox"
                    checked={subscribeMarketing}
                    onChange={(e) => setSubscribeMarketing(e.target.checked)}
                    className="mt-0.5 size-4 rounded-sm border border-zinc-500 bg-transparent accent-white"
                  />
                  <span className="text-xs leading-relaxed text-zinc-300">
                    Subscribe to marketing and product information emails.
                  </span>
                </label>

                {error ? (
                  <p className="text-sm text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !subscribeMarketing}
                  className="mt-4 w-full rounded-sm bg-white py-3 font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Create Account"}
                </button>
              </form>

              <p className="mt-8 text-center text-[10px] leading-relaxed text-zinc-500">
                By clicking Create Account, you agree to our{" "}
                <span className="cursor-pointer text-white hover:underline">Terms of Service</span>{" "}
                and{" "}
                <span className="cursor-pointer text-white hover:underline">
                  Infrastructure Policy
                </span>
                .
              </p>
            </section>
          ) : null}
        </div>
      </div>
  );
}
