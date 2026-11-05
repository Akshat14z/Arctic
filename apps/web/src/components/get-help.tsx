"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseResponseSchema, type CaseReason } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";

const REASONS: { value: CaseReason; label: string }[] = [
  { value: "item_not_as_described", label: "The item isn't as described" },
  { value: "misunderstanding", label: "We misunderstood each other" },
  { value: "payment_issue", label: "There's a problem with payment" },
  { value: "scam_suspected", label: "I think this is a scam" },
  { value: "other", label: "Something else" },
];

/** "Get help" in a chat: pick a reason, optionally explain, and a support agent joins (C6). */
export function GetHelp({ channelId, token }: { channelId: string; token: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<CaseReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { case: c } = await api("/api/cases", {
        method: "POST",
        body: { channelId, reason, ...(note.trim() && { note: note.trim() }) },
        token,
        schema: CaseResponseSchema,
      });
      dialog.current?.close();
      router.push(`/cases/${encodeURIComponent(c.id)}`);
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="min-h-tap shrink-0 rounded-lg border border-border bg-surface px-3 text-sm font-medium"
      >
        Get help
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="get-help-title"
        className="m-auto w-[min(100%-2rem,28rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/40"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 id="get-help-title" className="text-lg font-semibold">
              Get help from Handshake
            </h2>
            <p className="text-sm text-muted">
              A support agent joins this chat and sees the whole conversation in both languages.
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">What&apos;s wrong?</legend>
            {REASONS.map((r) => (
              <label
                key={r.value}
                className="flex min-h-tap cursor-pointer items-center gap-3 rounded-lg border border-border px-3 has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="accent-[var(--brand)]"
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="font-medium">
              Anything the agent should know? <span className="font-normal text-muted">(optional)</span>
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-base"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-tap flex-1 rounded-lg border border-border px-4 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || busy}
              className="min-h-tap flex-1 rounded-lg bg-brand px-4 font-medium text-brand-fg disabled:opacity-50"
            >
              {busy ? "Asking…" : "Ask for help"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
