import crypto from 'node:crypto';
import type { LangCode, TranscribeAudioRequest, TranscribeAudioResponse } from '@convocart/contracts';
import { getConfig } from '../config.js';
import { AppError } from '../errors.js';

interface AudioRecord {
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
}

// In-memory audio store for recorded voice notes
export const audioStore = new Map<string, AudioRecord>();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
function cleanupAudioStore(): void {
  const cutoff = Date.now() - ONE_DAY_MS;
  for (const [id, record] of audioStore.entries()) {
    if (record.createdAt < cutoff) {
      audioStore.delete(id);
    }
  }
}

/**
 * Transcribes voice memo audio using Google Gemini multimodal capabilities
 * and caches audio buffer for playback.
 */
export async function transcribeAudio(input: TranscribeAudioRequest): Promise<TranscribeAudioResponse> {
  const config = getConfig();

  // Strip data URL prefix if present (e.g. data:audio/webm;codecs=opus;base64,...)
  let base64Data = input.audioBase64.trim();
  let mimeType = (input.mimeType || 'audio/webm').trim();

  if (base64Data.includes(',')) {
    const commaIdx = base64Data.indexOf(',');
    const header = base64Data.substring(0, commaIdx);
    base64Data = base64Data.substring(commaIdx + 1).trim();

    const mimeMatch = header.match(/^data:([^;]+)/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1].trim();
    }
  }

  // Gemini API inline_data expects a strict canonical audio MIME type without parameters (e.g. "audio/webm", NOT "audio/webm;codecs=opus")
  let geminiMimeType = mimeType.split(';')[0].trim().toLowerCase();
  if (geminiMimeType.includes('webm')) {
    geminiMimeType = 'audio/webm';
  } else if (geminiMimeType.includes('ogg')) {
    geminiMimeType = 'audio/ogg';
  } else if (geminiMimeType.includes('wav')) {
    geminiMimeType = 'audio/wav';
  } else if (geminiMimeType.includes('mp4') || geminiMimeType.includes('m4a') || geminiMimeType.includes('aac')) {
    geminiMimeType = 'audio/mp4';
  } else if (geminiMimeType.includes('mp3') || geminiMimeType.includes('mpeg')) {
    geminiMimeType = 'audio/mp3';
  } else {
    geminiMimeType = 'audio/webm';
  }

  // Cache audio buffer for playback
  let audioUrl: string | undefined;
  try {
    cleanupAudioStore();
    const audioBuffer = Buffer.from(base64Data, 'base64');
    const audioId = crypto.randomUUID();
    audioStore.set(audioId, {
      buffer: audioBuffer,
      mimeType,
      createdAt: Date.now(),
    });
    audioUrl = `/api/audio/${audioId}`;
  } catch (err) {
    console.warn('[Voice] Failed to buffer audio for playback:', err);
  }

  // If no LLM key configured, return buffered audio immediately
  if (!config.LLM_API_KEY) {
    return {
      transcription: '',
      audioUrl,
    };
  }

  const primaryModel = config.LLM_MODEL.includes('3.5') ? 'gemini-2.0-flash' : config.LLM_MODEL;
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'])
  ).filter(Boolean);

  const prompt = `You are a real-time speech transcription engine for Handshake, a cross-language marketplace.
Listen to this audio recording carefully. Transcribe the spoken words verbatim in the language with code '${input.senderLang}'.
Guidelines:
- Output ONLY the exact transcribed speech text.
- Do NOT include any introductory or concluding remarks, explanations, or quotes.
- If the speech is faint or brief, output what was spoken.
- If there is only background noise or silence, return nothing.`;

  let transcription = '';

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.LLM_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s budget per candidate

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: geminiMimeType,
                    data: base64Data,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Voice] Model ${model} returned ${response.status}: ${errText}. Trying next fallback model.`);
        continue;
      }

      const data = (await response.json()) as any;
      const parts = data?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (typeof part?.text === 'string' && part.text.trim()) {
            transcription = part.text.trim();
          }
        }
      }
      break; // Successfully transcribed
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Voice] Model ${model} transcription attempt failed: ${errMsg}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Gracefully return audioUrl and transcription (degrade, never block)
  return {
    transcription,
    audioUrl,
  };
}
