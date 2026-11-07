import type { TranscribeAudioRequest, TranscribeAudioResponse } from '@convocart/contracts';
import { getConfig } from '../config.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors.js';
import { geminiGenerate } from './gemini.js';

const MAX_AUDIO_BYTES = 3 * 1024 * 1024; // a 60 s opus clip is ~0.3 MB; this is generous headroom

/** Gemini wants a bare audio type ("audio/webm", not "audio/webm;codecs=opus"). */
function geminiMime(mime: string): string {
  const m = mime.split(';')[0].trim().toLowerCase();
  if (m.includes('ogg')) return 'audio/ogg';
  if (m.includes('wav')) return 'audio/wav';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'audio/mp4';
  if (m.includes('mp3') || m.includes('mpeg')) return 'audio/mp3';
  return 'audio/webm';
}

/**
 * Stores the clip in the database (so playback survives restarts), then transcribes it with Gemini.
 * Always returns the audioUrl once stored; the transcription is best effort and may be empty.
 */
export async function transcribeAudio(input: TranscribeAudioRequest): Promise<TranscribeAudioResponse> {
  let base64 = input.audioBase64.trim();
  let mimeType = (input.mimeType || 'audio/webm').trim();
  const comma = base64.indexOf(',');
  if (base64.startsWith('data:') && comma > 0) {
    mimeType = /^data:([^;,]+)/.exec(base64)?.[1] ?? mimeType;
    base64 = base64.slice(comma + 1);
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_AUDIO_BYTES) {
    throw new AppError('VALIDATION_ERROR', 'Audio must be between 1 byte and 3 MB', 400, false);
  }

  const clip = await prisma.voiceClip.create({ data: { mimeType, data: buffer } });
  const audioUrl = `/api/audio/${clip.id}`;

  if (getConfig().NODE_ENV === 'test' || !getConfig().LLM_API_KEY) return { transcription: '', audioUrl };

  const prompt = `Transcribe this voice message verbatim in the language with code '${input.senderLang}'.
Output ONLY the spoken words, with no introduction, quotes or explanation. If there is only silence or noise, output nothing.`;
  try {
    // ponytail: 7 s per model, two fallbacks at most (~14 s); the web gives up at 30 s.
    const transcription = await geminiGenerate([{ inlineData: { mimeType: geminiMime(mimeType), data: base64 } }, { text: prompt }], {
      maxOutputTokens: 1024,
      timeoutMs: 7000,
      temperature: 0.1,
    });
    return { transcription, audioUrl };
  } catch (err) {
    console.warn('[Voice] transcription failed, sending audio only:', err instanceof Error ? err.message : err);
    return { transcription: '', audioUrl };
  }
}

export async function getVoiceClip(id: string) {
  return prisma.voiceClip.findUnique({ where: { id } });
}
