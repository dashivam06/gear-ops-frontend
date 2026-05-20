"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Check,
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  ApiRequestError,
  changePassword,
  deleteAccount,
  getProfile,
  logoutAuth,
  updateProfile,
} from "@/lib/api";
import {
  clearAuthProfileStorage,
  clearRefreshTokenCookie,
  clearAuthTokenStorage,
  getRefreshTokenCookie,
  setAuthProfileStorage,
} from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { UserHeader } from "@/components/layout/user-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { nameInitials } from "@/lib/utils";

function scorePassword(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

function strengthLabel(s: number): { label: string; color: string; w: string } {
  if (s <= 1) return { label: "Weak", color: "bg-red-500", w: "25%" };
  if (s === 2) return { label: "Fair", color: "bg-amber-500", w: "50%" };
  if (s === 3) return { label: "Good", color: "bg-blue-500", w: "75%" };
  return { label: "Strong", color: "bg-green-500", w: "100%" };
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white ">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
            <Icon className="size-5 text-zinc-700" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-zinc-950">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6 pt-5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [subscribed, setSubscribed] = useState(true);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingProfileImageFile, setPendingProfileImageFile] =
    useState<File | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string>>({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<string | null>(null);
  const [deleteFieldErrors, setDeleteFieldErrors] = useState<Record<string, string>>({});
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteRedirecting, setDeleteRedirecting] = useState(false);
  const [profileAvatarBroken, setProfileAvatarBroken] = useState(false);

  const pwScore = useMemo(() => scorePassword(newPw), [newPw]);
  const str = strengthLabel(pwScore);

  useEffect(() => {
    if (user?.fullName != null) setFullName(user.fullName);
  }, [user?.fullName]);

  useEffect(() => {
    setProfileAvatarBroken(false);
  }, [user?.profileImageUrl]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!accessToken || user) {
        return;
      }

      try {
        const profile = await getProfile(accessToken, user ?? undefined);
        if (!active) return;
        const mappedProfile = {
          ...(user || {}),
          fullName: profile.fullName,
          profileImageUrl: profile.profileImageUrl,
        };
        setUser(mappedProfile);
        setAuthProfileStorage(mappedProfile);
        setFullName(profile.fullName);
        setPhone(profile.phone || "");
        setAddress(profile.address || "");
        setSubscribed(profile.emailSubscribed ?? true);

        if (profile.status === "INACTIVE") {
          setProfileNotice("Your account is inactive. Contact support.");
        } else if (profile.status === "SUSPENDED") {
          setProfileNotice("Your account has been suspended. Contact support.");
        } else if (profile.status === "DELETED") {
          await redirectToLogin();
          return;
        } else {
          setProfileNotice(null);
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiRequestError) {
          if (error.status === 404 || error.status === 401) {
            await redirectToLogin();
            return;
          }
          if (error.status === 500) {
            setProfileNotice("Failed to load profile. Please try again.");
            return;
          }
          if (error.status === 503) {
            setProfileNotice("Service temporarily unavailable. Try again later.");
            return;
          }
          setProfileNotice(error.message);
          return;
        }
        setProfileNotice("Failed to load profile. Please try again.");
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [accessToken, setUser, user]);

  const memberSince = format(new Date(), "MMMM yyyy");

  async function redirectToLogin() {
    clearSession();
    clearRefreshTokenCookie();
    clearAuthTokenStorage();
    clearAuthProfileStorage();
    window.location.assign("/login");
  }

  return (
    <>
      <UserHeader
        title="Settings"
        subtitle="Manage your profile, security preferences, and account."
      />

      <div className="w-full max-w-none space-y-6">
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
          {/* Left: profile + identity */}
          <div className="flex flex-col gap-6 xl:col-span-6">
            <SettingsCard
              icon={User}
              title="Profile & identity"
              description="Your name and photo appear in the app sidebar and invoices."
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative mx-auto shrink-0 sm:mx-0"
                  aria-label="Change profile photo"
                >
                  <div className="relative size-28 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 sm:size-32">
                    {user?.profileImageUrl && !profileAvatarBroken ? (
                      <img
                        src={user.profileImageUrl}
                        alt=""
                        className="size-full object-cover"
                        onError={() => setProfileAvatarBroken(true)}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-zinc-100 text-xl font-semibold text-zinc-600 sm:text-2xl">
                        {nameInitials(fullName || user?.email || "?")}
                      </div>
                    )}
                  </div>
                  <span className="absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors group-hover:bg-zinc-50">
                    <Camera className="size-4" aria-hidden />
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPendingProfileImageFile(f);
                    setProfileFieldErrors((prev) => ({ ...prev, profileImage: "" }));
                    const url = URL.createObjectURL(f);
                    if (user) {
                      setUser({ ...user, profileImageUrl: url });
                    }
                  }}
                />

                <div className="min-w-0 flex-1 space-y-5">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                      Member since
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-900">
                      {memberSince}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="fn" className="text-zinc-700">
                      Full name
                    </Label>
                    <Input
                      id="fn"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setProfileFieldErrors((prev) => ({ ...prev, fullName: "" }));
                      }}
                      className="mt-1.5 h-10 rounded-xl border-zinc-200"
                    />
                    {profileFieldErrors.fullName ? (
                      <p className="mt-1.5 text-sm text-red-600">{profileFieldErrors.fullName}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="ph" className="text-zinc-700">
                      Phone
                    </Label>
                    <Input
                      id="ph"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setProfileFieldErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      className="mt-1.5 h-10 rounded-xl border-zinc-200"
                    />
                    {profileFieldErrors.phone ? (
                      <p className="mt-1.5 text-sm text-red-600">{profileFieldErrors.phone}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="addr" className="text-zinc-700">
                      Address
                    </Label>
                    <Input
                      id="addr"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setProfileFieldErrors((prev) => ({ ...prev, address: "" }));
                      }}
                      className="mt-1.5 h-10 rounded-xl border-zinc-200"
                    />
                    {profileFieldErrors.address ? (
                      <p className="mt-1.5 text-sm text-red-600">{profileFieldErrors.address}</p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="em" className="text-zinc-700">
                      Email
                    </Label>
                    <div className="relative mt-1.5">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        id="em"
                        value={user?.email ?? ""}
                        readOnly
                        className="h-10 cursor-not-allowed rounded-xl border-zinc-200 bg-zinc-50 pl-10 text-zinc-500"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-zinc-400">
                      Email is tied to billing and cannot be changed here.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6 bg-zinc-100" />

              <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3">
                <div className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                    <Bell className="size-4 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      Product emails
                    </p>
                    <p className="text-xs text-zinc-500">
                      Release notes, tips, and occasional announcements from
                      Fleebug.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={subscribed}
                  onCheckedChange={(checked) => {
                    setSubscribed(checked);
                    setProfileFieldErrors((prev) => ({ ...prev, emailSubscribed: "" }));
                  }}
                />
              </div>
              {profileFieldErrors.emailSubscribed ? (
                <p className="mt-2 text-sm text-red-600">{profileFieldErrors.emailSubscribed}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-zinc-950 px-6 text-white hover:bg-zinc-900"
                  onClick={async () => {
                    setSaveError(null);
                    setProfileFieldErrors({});
                    try {
                      const payload = {
                        fullName: fullName.trim() || user?.fullName || "",
                        phone: phone.trim(),
                        address: address.trim(),
                        profileImage: user?.profileImageUrl ?? "",
                        emailSubscribed: subscribed,
                      };

                      if (pendingProfileImageFile) {
                        payload.profileImage = await uploadImageToCloudinary(
                          pendingProfileImageFile,
                          "profile-images"
                        );
                      }

                      const updatedProfile = await updateProfile(accessToken || "", payload);
                      const mappedProfile = {
                        ...(user || {}),
                        fullName: updatedProfile.fullName,
                        profileImageUrl: updatedProfile.profileImageUrl
                      };
                      setUser(mappedProfile);
                      setAuthProfileStorage(mappedProfile);
                      setFullName(updatedProfile.fullName);
                      setSubscribed(updatedProfile.emailSubscribed);
                      setPendingProfileImageFile(null);
                      setProfileNotice(null);
                      setSaved(true);
                      setTimeout(() => setSaved(false), 2500);
                    } catch (error) {
                      if (error instanceof ApiRequestError) {
                        if (
                          error.status === 400 &&
                          error.message === "Deleted account cannot be updated"
                        ) {
                          setSaveError(error.message);
                          await redirectToLogin();
                          return;
                        }
                        if (Object.keys(error.fieldErrors).length > 0) {
                          setProfileFieldErrors(error.fieldErrors);
                          return;
                        }
                        if (error.status === 401) {
                          await redirectToLogin();
                          return;
                        }
                        setSaveError(error.message || "Failed to update profile. Please try again.");
                        return;
                      }
                      setSaveError("Failed to update profile. Please try again.");
                    }
                  }}
                >
                  Save changes
                </Button>
                {saveError ? (
                  <span className="text-sm font-medium text-red-600">{saveError}</span>
                ) : null}
                {saved ? (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                    <Check className="size-4" /> Profile updated
                  </span>
                ) : null}
              </div>
              {profileNotice ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {profileNotice}
                </p>
              ) : null}
            </SettingsCard>
          </div>

          {/* Right: security */}
          <div className="flex flex-col gap-6 xl:col-span-6">
            <SettingsCard
              icon={Shield}
              title="Security"
              description="Password and sign-in controls for your Gear Ops account."
            >
              <div className="w-full">
                <div className="space-y-5 rounded-2xl p-5 pb-2 lg:space-y-6 lg:p-6">
                  <div>
                    <Label className="text-zinc-700">Current password</Label>
                    <div className="relative mt-1.5">
                      <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                      <Input
                        type={show1 ? "text" : "password"}
                        value={curPw}
                        onChange={(e) => {
                          setCurPw(e.target.value);
                          if (pwFieldErrors.currentPassword) {
                            setPwFieldErrors((prev) => ({ ...prev, currentPassword: "" }));
                          }
                          if (pwError === "Current password is incorrect") {
                            setPwError(null);
                          }
                        }}
                        className={`h-10 rounded-xl border-zinc-200 pr-10 pl-10 ${pwFieldErrors.currentPassword ? "text-red-600" : ""
                          }`}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setShow1(!show1)}
                        aria-label={show1 ? "Hide password" : "Show password"}
                      >
                        {show1 ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-700">New password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type={show2 ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => {
                          setNewPw(e.target.value);
                          if (pwFieldErrors.newPassword) {
                            setPwFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                          }
                        }}
                        className="h-10 rounded-xl border-zinc-200 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setShow2(!show2)}
                        aria-label={show2 ? "Hide password" : "Show password"}
                      >
                        {show2 ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {pwFieldErrors.newPassword ? (
                      <p className="mt-1.5 text-sm text-red-600">
                        {pwFieldErrors.newPassword}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full transition-all ${str.color}`}
                          style={{ width: str.w }}
                        />
                      </div>
                      <p className="text-right text-xs text-zinc-500">
                        {str.label}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-700">Confirm new password</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type={show3 ? "text" : "password"}
                        value={confPw}
                        onChange={(e) => setConfPw(e.target.value)}
                        className="h-10 rounded-xl border-zinc-200 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                        onClick={() => setShow3(!show3)}
                        aria-label={show3 ? "Hide password" : "Show password"}
                      >
                        {show3 ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {pwFieldErrors.confirmPassword ? (
                      <p className="mt-1.5 text-sm text-red-600">
                        {pwFieldErrors.confirmPassword}
                      </p>
                    ) : null}
                  </div>

                  {pwError ? (
                    <p className="text-sm text-red-600">{pwError}</p>
                  ) : null}

                  <div className="border-t border-zinc-100 pt-5">
                    <Button
                      type="button"
                      disabled={pwLoading}
                      className="h-10 w-full rounded-xl bg-zinc-950 px-6 text-white hover:bg-zinc-900 sm:w-auto"
                      onClick={async () => {
                        setPwFieldErrors({});
                        if (curPw.length < 1) {
                          setPwError("Current password is incorrect.");
                          return;
                        }
                        if (newPw !== confPw) {
                          setPwError("Passwords do not match.");
                          return;
                        }
                        setPwError(null);
                        setPwSaved(false);
                        setPwLoading(true);
                        try {
                          await changePassword(accessToken || "", {
                            currentPassword: curPw,
                            newPassword: newPw,
                            confirmPassword: confPw,
                          });
                          setCurPw("");
                          setNewPw("");
                          setConfPw("");
                          setPwSaved(true);
                          setTimeout(() => setPwSaved(false), 2500);
                        } catch (error) {
                          if (error instanceof ApiRequestError) {
                            if (Object.keys(error.fieldErrors).length > 0) {
                              setPwFieldErrors(error.fieldErrors);
                              if (error.fieldErrors.confirmPassword) {
                                setPwError(error.fieldErrors.confirmPassword);
                              } else if (error.fieldErrors.currentPassword) {
                                setPwError(error.fieldErrors.currentPassword);
                              }
                              return;
                            }
                            if (error.status === 401) {
                              const msg = (error.message || "").toLowerCase();
                              if (
                                msg.includes("invalid old password") ||
                                msg.includes("current password is incorrect")
                              ) {
                                setPwFieldErrors({ currentPassword: "Current password is incorrect" });
                                setPwError("Current password is incorrect");
                                return;
                              }
                              await redirectToLogin();
                              return;
                            }
                            if (Object.keys(error.fieldErrors).length > 0) {
                              setPwError(Object.values(error.fieldErrors)[0]);
                            } else {
                              setPwError(error.message);
                            }
                          } else {
                            setPwError("Failed to change password. Please try again.");
                          }
                        } finally {
                          setPwLoading(false);
                        }
                      }}
                    >
                      {pwLoading ? "Updating..." : "Update password"}
                    </Button>
                    {pwSaved ? (
                      <span className="mt-3 block text-sm font-medium text-green-600">
                        Password changed successfully
                      </span>
                    ) : null}
                  </div>


                </div>
              </div>
            </SettingsCard>
          </div>
        </div>

        {/* Danger zone — full width */}
        <SettingsCard
          icon={AlertTriangle}
          title="Danger zone"
          description="Irreversible actions. Proceed only if you intend to leave Gear Ops."
        >
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white">
                  <Trash2 className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    Delete account
                  </p>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-600">
                    Permanently removes your profile, API keys, usage history,
                    and wallet data. Active subscriptions and balances may be
                    forfeited per our policy.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                type="button"
                className="h-10 w-full lg:w-auto shrink-0 rounded-xl border-red-200 bg-white px-5 text-red-600 hover:bg-red-50 lg:ml-4"
                onClick={() => {
                  setDeleteConfirm("");
                  setShowDeletePw(false);
                  setDeleteError(null);
                  setDeleteInfo(null);
                  setDeleteFieldErrors({});
                  setDeleteLoading(false);
                  setDeleteRedirecting(false);
                  setDeleteOpen(true);
                }}
              >
                Delete account
              </Button>
            </div>
          </div>
        </SettingsCard>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="font-montserrat rounded-2xl border border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all API keys, tasks,
              and usage records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="del">Enter current password to confirm</Label>
            <div className="relative mt-1.5">
              <Input
                id="del"
                type={showDeletePw ? "text" : "password"}
                value={deleteConfirm}
                disabled={deleteLoading || deleteRedirecting}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value);
                  setDeleteFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                className="h-10 rounded-xl pr-10"
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                onClick={() => setShowDeletePw((prev) => !prev)}
                aria-label={showDeletePw ? "Hide password" : "Show password"}
                disabled={deleteLoading || deleteRedirecting}
              >
                {showDeletePw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {deleteFieldErrors.password ? (
              <p className="text-sm text-red-600">{deleteFieldErrors.password}</p>
            ) : null}
            {deleteError ? (
              <p className="text-sm text-red-600">{deleteError}</p>
            ) : null}
            {deleteInfo ? (
              <p className="text-sm text-emerald-700">{deleteInfo}</p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading || deleteRedirecting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-600 font-montserrat"
              disabled={!deleteConfirm || deleteLoading || deleteRedirecting}
              onClick={async (e) => {
                e.preventDefault();
                setDeleteError(null);
                setDeleteInfo(null);
                setDeleteFieldErrors({});
                setDeleteRedirecting(false);
                setDeleteLoading(true);
                try {
                  await deleteAccount(accessToken || "", { password: deleteConfirm });
                  const refreshToken = getRefreshTokenCookie();
                  if (refreshToken) {
                    try {
                      await logoutAuth(); // The actual app uses logoutAuth with no arguments as per api.ts
                    } catch {
                      // The backend already revoked sessions if the delete succeeded.
                    }
                  }
                  clearSession();
                  clearRefreshTokenCookie();
                  clearAuthTokenStorage();
                  setDeleteRedirecting(true);
                  setDeleteInfo("Account deleted successfully. Redirecting to login...");
                  window.setTimeout(() => {
                    window.location.replace("/login");
                  }, 1200);
                  return;
                } catch (error) {
                  if (error instanceof ApiRequestError) {
                    const normalizedDeleteMessage = error.message.trim().toLowerCase();
                    if (Object.keys(error.fieldErrors).length > 0) {
                      setDeleteFieldErrors(error.fieldErrors);
                      return;
                    }
                    if (error.status === 401 && normalizedDeleteMessage.includes("invalid password")) {
                      setDeleteFieldErrors({ password: "Incorrect password" });
                      return;
                    }
                    if (error.status === 400 && error.message === "Account is already deleted") {
                      clearSession();
                      clearRefreshTokenCookie();
                      clearAuthTokenStorage();
                      window.location.replace("/login");
                      return;
                    }
                    if (error.status === 401) {
                      clearSession();
                      clearRefreshTokenCookie();
                      clearAuthTokenStorage();
                      window.location.replace("/login");
                      return;
                    }
                    setDeleteError(error.message || "Failed to delete account. Try again.");
                  } else {
                    const fallbackMessage =
                      typeof error === "object" &&
                        error !== null &&
                        "message" in error &&
                        typeof (error as { message?: unknown }).message === "string"
                        ? ((error as { message: string }).message || "Failed to delete account. Please try again.")
                        : "Failed to delete account. Please try again.";
                    setDeleteError(fallbackMessage);
                  }
                } finally {
                  setDeleteLoading(false);
                }
              }}
            >
              {deleteLoading
                ? "Deleting..."
                : deleteRedirecting
                  ? "Redirecting..."
                  : "Delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
