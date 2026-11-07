"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaseResponseSchema, type CaseReason } from "@convocart/contracts";
import { api, friendlyMessage } from "@/lib/api/client";
import { REASONS } from "@/lib/cases";

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
        className="btn btn-secondary shrink-0 text-sm"
      >
        Get help
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="get-help-title"
        className="m-auto w-[min(100%-2rem,28rem)] border-y-4 border-double border-text bg-bg p-0 text-text backdrop:bg-text/40"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 id="get-help-title" className="section-title">
              Get help from Handshake
            </h2>
            <p className="meta">
              A support agent joins this chat and sees the whole conversation in both languages.
            </p>
          </div>
          <hr className="rule-double" />

          <fieldset className="flex flex-col">
            <legend className="label mb-2">What&apos;s wrong?</legend>
            {REASONS.map((r) => (
              <label
                key={r.value}
                className="flex min-h-tap cursor-pointer items-center gap-3 border-b border-border px-1 first-of-type:border-t hover:bg-surface has-[:checked]:bg-surface has-[:checked]:font-semibold"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="size-4 shrink-0 accent-text"
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="label">
              Anything the agent should know? <span className="hint">(optional)</span>
            </span>
            <textarea
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="field"
            />
          </label>

          {error && (
            <p role="alert" className="note note-error">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || busy}
              aria-busy={busy}
              className="btn btn-primary flex-1"
            >
              {busy ? "Asking…" : "Ask for help"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
