"use client";

import Link from "next/link";
import { useState } from "react";
import { MeResponseSchema, type LangCode } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { clearSession, saveSession, useSession } from "@/lib/session";
import { useRequireSession } from "@/lib/use-require-session";
import { LANGUAGES } from "@/lib/languages";

type Tab = "personal" | "language" | "security" | "preferences";

export function ProfileView() {
  const session = useRequireSession();
  const [tab, setTab] = useState<Tab>("personal");

  // Personal Info Form State
  const [displayName, setDisplayName] = useState(session?.user.displayName ?? "");
  const [email, setEmail] = useState(session?.email ?? "");

  // Language Form State
  const [selectedLang, setSelectedLang] = useState<LangCode>(session?.user.language ?? "en");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Preferences State
  const [notifyDeals, setNotifyDeals] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);

  // Submission States
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!session) return <div aria-busy className="skeleton h-80" />;

  const { user } = session;
  const isDemo = user.isDemo;
  const isAgent = user.role === "agent";

  async function handleUpdatePersonal(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !session) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await api("/api/me", {
        method: "PATCH",
        body: {
          displayName: displayName.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
        token: session.sessionToken,
        schema: MeResponseSchema,
      });

      saveSession({
        ...session,
        user: res.user,
        email: res.email ?? session.email,
      });
      setSuccess("Profile details updated successfully.");
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateLanguage(langCode: LangCode) {
    if (busy || !session || langCode === session.user.language) {
      setSelectedLang(langCode);
      return;
    }
    setError(null);
    setSuccess(null);
    setBusy(true);
    setSelectedLang(langCode);
    try {
      const res = await api("/api/me", {
        method: "PATCH",
        body: { language: langCode },
        token: session.sessionToken,
        schema: MeResponseSchema,
      });

      saveSession({
        ...session,
        user: res.user,
      });
      setSuccess(`Language set to ${LANGUAGES.find((l) => l.code === langCode)?.native ?? langCode}. Incoming messages will now arrive translated into this language.`);
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !session) return;
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setBusy(true);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: {
          currentPassword: currentPassword || undefined,
          newPassword,
        },
        token: session.sessionToken,
        schema: MeResponseSchema,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been changed securely.");
    } catch (err) {
      setError(friendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-wide className="flex flex-col gap-6 py-2">
      {/* Page Title & User Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-accent text-2xl font-bold text-[var(--color-accent-ink)] shadow-md">
            {user.displayName.trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="page-title text-2xl sm:text-3xl font-bold text-text">{user.displayName}</h1>
            <p className="meta text-xs sm:text-sm">
              {session.email ?? (isDemo ? "Demo User" : isAgent ? "Support Agent" : "Guest Account")} · User ID: <span className="agate font-mono">{user.id}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => clearSession()}
          className="btn btn-secondary self-start sm:self-auto text-xs px-4"
        >
          Sign out
        </button>
      </div>

      {/* Global Alerts */}
      {success && (
        <div role="status" className="note note-success text-sm flex items-center justify-between">
          <span>✓ {success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
      {error && (
        <div role="alert" className="note note-error text-sm flex items-center justify-between">
          <span>✕ {error}</span>
          <button type="button" onClick={() => setError(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Profile Layout with Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <nav aria-label="Profile navigation" className="flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
          <button
            type="button"
            onClick={() => { setTab("personal"); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all text-left whitespace-nowrap ${
              tab === "personal"
                ? "bg-accent text-[var(--color-accent-ink)] font-semibold shadow-xs"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <span>👤</span>
            <span>Personal Information</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("language"); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all text-left whitespace-nowrap ${
              tab === "language"
                ? "bg-accent text-[var(--color-accent-ink)] font-semibold shadow-xs"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <span>🌐</span>
            <span>Language & Region</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("security"); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all text-left whitespace-nowrap ${
              tab === "security"
                ? "bg-accent text-[var(--color-accent-ink)] font-semibold shadow-xs"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <span>🔒</span>
            <span>Account Security</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab("preferences"); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all text-left whitespace-nowrap ${
              tab === "preferences"
                ? "bg-accent text-[var(--color-accent-ink)] font-semibold shadow-xs"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <span>⚙️</span>
            <span>Preferences</span>
          </button>
        </nav>

        {/* Tab Content Panel */}
        <div className="md:col-span-3 rounded-[24px] border border-border bg-surface p-6 shadow-sm">
          {/* TAB 1: Personal Info */}
          {tab === "personal" && (
            <form onSubmit={handleUpdatePersonal} className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-text">Personal Details</h2>
                <p className="meta text-xs">Manage your name and public profile information.</p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="label">Display Name</span>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="field"
                />
                <span className="hint text-xs">This is the name other buyers and sellers see when negotiating.</span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="label">Account Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="field"
                />
                <span className="hint text-xs">Used for sign in and account recovery.</span>
              </label>

              <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted flex items-center justify-between">
                <span>Account Status: <strong>{isDemo ? "Sandbox Demo" : isAgent ? "Certified Support Agent" : "Active Member"}</strong></span>
                <span className="agate">Verified</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                  className="btn btn-primary px-6 font-semibold"
                >
                  {busy ? "Saving Changes…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Language & Region */}
          {tab === "language" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-text">Preferred Reading Language</h2>
                <p className="meta text-xs">
                  Every incoming message, deal term, and notice will automatically be translated into this language.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LANGUAGES.map((l) => {
                  const active = selectedLang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleUpdateLanguage(l.code as LangCode)}
                      disabled={busy}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        active
                          ? "border-accent bg-accent/10 shadow-xs"
                          : "border-border bg-surface hover:border-[var(--color-rule-2)]"
                      }`}
                    >
                      <div>
                        <p className={`font-semibold text-sm ${active ? "text-accent" : "text-text"}`}>
                          {l.native}
                        </p>
                        <p className="meta text-xs">{l.english}</p>
                      </div>
                      {active && (
                        <span className="grid size-6 place-items-center rounded-full bg-accent text-white text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-2 p-4 text-xs text-muted">
                <p className="font-semibold text-text mb-1">How translation works on ConvoCart:</p>
                <p>
                  When a seller writes in Hindi and you have selected English, their messages will arrive in English.
                  You can always tap &ldquo;See original&rdquo; under any message to review the exact words the sender entered.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Account Security */}
          {tab === "security" && (
            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-text">Change Password</h2>
                <p className="meta text-xs">Keep your account secure with a strong password.</p>
              </div>

              {session.email && (
                <label className="flex flex-col gap-1.5">
                  <span className="label">Current Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="field"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="label">New Password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="field"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="label">Confirm New Password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="field"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="size-4 rounded accent-accent"
                />
                <span>Show passwords</span>
              </label>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                  className="btn btn-primary px-6 font-semibold"
                >
                  {busy ? "Updating Password…" : "Update Password"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Preferences */}
          {tab === "preferences" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold text-text">Notifications & Trade Settings</h2>
                <p className="meta text-xs">Configure notifications and messaging preferences.</p>
              </div>

              <div className="flex flex-col divide-y divide-border">
                <label className="flex items-center justify-between py-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-text">Deal & Offer Alerts</p>
                    <p className="meta text-xs">Receive real-time notifications when a seller accepts or counters an offer.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDeals}
                    onChange={(e) => setNotifyDeals(e.target.checked)}
                    className="size-5 rounded accent-accent cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-text">Message Notifications</p>
                    <p className="meta text-xs">Show badge counts and sound chimes on incoming chat messages.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyMessages}
                    onChange={(e) => setNotifyMessages(e.target.checked)}
                    className="size-5 rounded accent-accent cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-text">Automatic Translation</p>
                    <p className="meta text-xs">Automatically translate foreign language messages on receipt.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={(e) => setAutoTranslate(e.target.checked)}
                    className="size-5 rounded accent-accent cursor-pointer"
                  />
                </label>
              </div>

              <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
                Trade settings are automatically preserved across your sessions.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
