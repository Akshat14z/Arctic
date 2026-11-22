"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MeResponseSchema,
  type AuthResponse as Session,
  type LangCode,
} from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { saveSession, signOut } from "@/lib/session";
import { useRequireSession } from "@/lib/use-require-session";
import { LANGUAGES } from "@/lib/languages";

/** Account settings: name and email, reading language, password. Demo accounts are shared, so they're read-only. */
export function ProfileView() {
  const session = useRequireSession();
  if (!session) return <div aria-busy className="skeleton h-80" />;
  // Keyed by user so the forms start from the loaded session, not from the empty first render.
  return <Settings key={session.user.id} session={session} />;
}

function Settings({ session }: { session: Session }) {
  const { user } = session;
  const locked = user.isDemo;
  const kind = user.isDemo
    ? "Demo account"
    : user.role === "agent"
      ? "Support agent"
      : session.email
        ? null
        : "Guest";
  const profileSignals = [user.displayName, session.email, user.avatarUrl, user.bio, user.businessDescription];
  const completion = Math.round((profileSignals.filter(Boolean).length / profileSignals.length) * 100);
  const profileLevel = completion >= 100 ? "Storefront ready" : completion >= 60 ? "Growing profile" : "Getting started";

  return (
    <div data-wide className="mx-auto flex w-full max-w-5xl flex-col gap-7">
      <header className="profile-hero">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden
            className="profile-avatar grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xl font-semibold text-[var(--color-accent-ink)]"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-managed public avatar URL
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : user.displayName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Trader profile</p>
            <h1 className="page-title break-words">{user.displayName}</h1>
            <p className="meta break-words">{session.email ?? kind}</p>
          </div>
        </div>
        <div className="profile-progress">
          <div className="flex items-end justify-between gap-4">
            <div><p className="eyebrow">Profile level</p><p className="font-semibold">{profileLevel}</p></div>
            <p className="agate text-xl font-semibold">{completion}%</p>
          </div>
          <div className="profile-progress-track" role="progressbar" aria-label="Profile completion" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${completion}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="profile-badge">Language set</span>
            {session.email && <span className="profile-badge">Account secured</span>}
            {(user.bio || user.businessDescription) && <span className="profile-badge">Seller story added</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-2">
          {user.role === "user" && <Link href={`/sellers/${user.id}`} className="btn btn-primary">View public storefront</Link>}
          <button type="button" onClick={signOut} className="btn btn-secondary">Sign out</button>
        </div>
      </header>

      {locked && (
        <p className="note">
          This demo account is shared by everyone trying CommonGrounds, so its
          settings can&apos;t be changed. Create your own account to set a name,
          language and password.
        </p>
      )}

      <ProfileSection session={session} locked={locked} />
      <LanguageSection session={session} locked={locked} />
      {!locked && session.email && <PasswordSection session={session} />}
    </div>
  );
}

/** One settings block: title and description on the left at wide sizes, the form on the right. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="profile-panel grid gap-5 md:grid-cols-[14rem_1fr] md:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="meta">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

function useSave(session: Session) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save(
    body: Record<string, unknown>,
    done: string,
    keepEmail = true,
  ) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await api("/api/me", {
        method: "PATCH",
        body,
        token: session.sessionToken,
        schema: MeResponseSchema,
      });
      saveSession({
        ...session,
        user: res.user,
        email: keepEmail ? (res.email ?? session.email) : session.email,
      });
      setMsg({ ok: true, text: done });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: friendlyMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const note = msg && (
    <p
      role={msg.ok ? "status" : "alert"}
      className={`note ${msg.ok ? "note-success" : "note-error"}`}
    >
      {msg.text}
    </p>
  );
  return { busy, save, note, setMsg };
}

function ProfileSection({
  session,
  locked,
}: {
  session: Session;
  locked: boolean;
}) {
  const [name, setName] = useState(session.user.displayName);
  const [email, setEmail] = useState(session.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl ?? "");
  const [bio, setBio] = useState(session.user.bio ?? "");
  const [businessDescription, setBusinessDescription] = useState(session.user.businessDescription ?? "");
  const { busy, save, note } = useSave(session);
  const changed =
    name.trim() !== session.user.displayName ||
    email.trim() !== (session.email ?? "") ||
    avatarUrl.trim() !== (session.user.avatarUrl ?? "") ||
    bio.trim() !== (session.user.bio ?? "") ||
    businessDescription.trim() !== (session.user.businessDescription ?? "");
  return (
    <Section
      title="Profile"
      description="The name buyers and sellers see in chats."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (changed)
            save(
              {
                displayName: name.trim(),
                ...(email.trim() ? { email: email.trim() } : {}),
                avatarUrl: avatarUrl.trim() || null,
                bio: bio.trim() || null,
                businessDescription: businessDescription.trim() || null,
              },
              "Saved.",
            );
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="label">Avatar URL</span>
          <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} disabled={locked} placeholder="https://" className="field" />
          <span className="hint">Shown publicly on your storefront.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Short bio</span>
          <input maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} disabled={locked} placeholder="What you sell and what buyers can expect" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Business description</span>
          <textarea rows={4} maxLength={1200} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} disabled={locked} placeholder="Tell buyers about your stock, service and fulfilment." className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Name</span>
          <input
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={locked}
            autoComplete="name"
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={locked}
            autoComplete="email"
            placeholder="you@example.com"
            className="field"
          />
          <span className="hint">
            For signing in. Never shown to other people.
          </span>
        </label>
        {note}
        {!locked && (
          <button
            type="submit"
            disabled={busy || !changed}
            aria-busy={busy}
            className="btn btn-primary self-start"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </form>
    </Section>
  );
}

function LanguageSection({
  session,
  locked,
}: {
  session: Session;
  locked: boolean;
}) {
  const [lang, setLang] = useState<LangCode>(session.user.language);
  const { busy, save, note } = useSave(session);
  async function pick(code: LangCode) {
    if (locked || busy || code === lang) return;
    const before = lang;
    setLang(code);
    const ok = await save(
      { language: code },
      `Messages now arrive in ${LANGUAGES.find((l) => l.code === code)?.native ?? code}.`,
    );
    if (!ok) setLang(before);
  }
  return (
    <Section
      title="Reading language"
      description="Every message, offer and notice arrives in this language. Tap See original under any message for the sender's words."
    >
      {/* Shared demo accounts can't change language: show the one in use instead of eight dead options. */}
      {locked ? (
        <p className="text-sm">
          <span lang={lang} className="font-medium">
            {LANGUAGES.find((l) => l.code === lang)?.native}
          </span>{" "}
          <span className="meta">
            ({LANGUAGES.find((l) => l.code === lang)?.english})
          </span>
        </p>
      ) : (
        <fieldset
          disabled={busy}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <legend className="sr-only">Reading language</legend>
          {LANGUAGES.map((l) => (
            <label
              key={l.code}
              className="flex min-h-tap cursor-pointer items-center gap-3 rounded-[var(--radius-field)] border border-border px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-surface has-[:disabled]:cursor-default"
            >
              <input
                type="radio"
                name="lang"
                checked={lang === l.code}
                onChange={() => pick(l.code as LangCode)}
                className="size-4 shrink-0 accent-[var(--color-accent)]"
              />
              <span className="flex min-w-0 flex-col">
                <span lang={l.code} className="font-medium">
                  {l.native}
                </span>
                <span className="meta text-xs">{l.english}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {note}
    </Section>
  );
}

function PasswordSection({ session }: { session: Session }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const { busy, save, note, setMsg } = useSave(session);
  const hasPassword = !!session.email;
  return (
    <Section
      title="Password"
      description={
        hasPassword
          ? "Change the password you sign in with."
          : "Set a password to sign in from another device."
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (next.length < 8)
            return setMsg({ ok: false, text: "Use at least 8 characters." });
          if (
            await save(
              {
                ...(hasPassword ? { currentPassword: current } : {}),
                newPassword: next,
              },
              "Password changed.",
              false,
            )
          ) {
            setCurrent("");
            setNext("");
          }
        }}
        className="flex flex-col gap-4"
      >
        {hasPassword && (
          <label className="flex flex-col gap-1.5">
            <span className="label">Current password</span>
            <input
              type={show ? "text" : "password"}
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="field"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="label">New password</span>
          <input
            type={show ? "text" : "password"}
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="field"
          />
          <span className="hint">At least 8 characters.</span>
        </label>
        <label className="flex min-h-tap cursor-pointer items-center gap-2 self-start text-sm">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            className="size-4 accent-[var(--color-accent)]"
          />
          Show passwords
        </label>
        {note}
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="btn btn-primary self-start"
        >
          {busy ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </button>
      </form>
    </Section>
  );
}
