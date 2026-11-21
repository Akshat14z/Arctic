// "Listen in my language" (DHRUMIL-T22): read a message aloud with the device's own voices (Web Speech API).
// No server, no cost. The button only shows when this device really has a voice for the language.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { LangCode } from "@convocart/contracts";

const TAGS: Record<LangCode, string> = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN", kn: "kn-IN", bn: "bn-IN", mr: "mr-IN", ja: "ja-JP" };

type VoiceLike = { lang: string; localService?: boolean; name: string };

/** The best voice for a language: exact region first (hi-IN), then any voice of that language, local voices first. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: LangCode): V | null {
  const want = TAGS[lang].toLowerCase();
  const norm = (v: V) => v.lang.replace("_", "-").toLowerCase();
  const rank = (v: V) => (norm(v) === want ? 0 : 2) + (v.localService ? 0 : 1);
  const same = voices.filter((v) => norm(v).split("-")[0] === lang);
  return same.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

// Which message is being read aloud right now (one at a time).
let speaking: string | null = null;
const listeners = new Set<() => void>();
const setSpeaking = (id: string | null) => {
  speaking = id;
  listeners.forEach((l) => l());
};

/** A voice for the language (or null), whether this message is being read, and a toggle to read or stop it. */
export function useSpeech(id: string, lang: LangCode) {
  const voice = pickVoice(useVoices(), lang);
  const active = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => speaking === id,
    () => false,
  );
  function toggle(text: string) {
    speechSynthesis.cancel();
    if (active || !voice) return setSpeaking(null);
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.95;
    u.onend = u.onerror = () => speaking === id && setSpeaking(null);
    setSpeaking(id);
    speechSynthesis.speak(u);
  }
  return { available: !!voice, active, toggle };
}
