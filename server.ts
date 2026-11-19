import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  VOICE_SAMPLES,
  SUPPORTED_LANGUAGES,
  DELIVERY_TONES,
  getLanguageByCode,
  getVoicePresetById,
  type LanguageCode,
  type VoiceGender,
} from './src/shared/voices.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MAX_SCRIPT_CHARS = 4000;

let cachedClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

interface CachedSample {
  audioBase64: string;
  durationSec: number;
  byteLength: number;
  mimeType: string;
}

const sampleAudioCache = new Map<string, CachedSample>();
const sampleInFlight = new Map<string, Promise<CachedSample>>();

function calculateWavDurationSec(wavBuffer: Buffer): number {
  if (wavBuffer.length <= 44) return 0;
  const isRiff =
    wavBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    wavBuffer.subarray(8, 12).toString('ascii') === 'WAVE';

  if (isRiff) {
    const byteRate = wavBuffer.readUInt32LE(28);
    if (byteRate > 0) {
      let offset = 12;
      while (offset + 8 <= wavBuffer.length) {
        const chunkId = wavBuffer.subarray(offset, offset + 4).toString('ascii');
        const chunkSize = wavBuffer.readUInt32LE(offset + 4);
        if (chunkId === 'data') {
          const actualDataBytes = Math.min(chunkSize, wavBuffer.length - (offset + 8));
          return Math.max(0.1, Number((actualDataBytes / byteRate).toFixed(2)));
        }
        offset += 8 + chunkSize + (chunkSize % 2);
      }
      return Math.max(0.1, Number(((wavBuffer.length - 44) / byteRate).toFixed(2)));
    }
  }
  return Math.max(0.1, Number(((wavBuffer.length - 44) / 48000).toFixed(2)));
}

async function withTransientRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number })?.status;
      const isRetryable =
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        /ECONNRESET|ETIMEDOUT|UNAVAILABLE|INTERNAL/i.test(msg);

      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }
  throw lastError;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;

  if (/GEMINI_API_KEY is not configured/i.test(rawMessage)) {
    return { status: 500, message: rawMessage };
  }
  if (status === 403 || /PERMISSION_DENIED|API_KEY_INVALID/i.test(rawMessage)) {
    return {
      status: 403,
      message:
        'Gemini API key was rejected. Please verify your API key in Settings > Secrets.',
    };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(rawMessage)) {
    return {
      status: 429,
      message:
        'Rate limit or quota reached for speech generation. Wait a moment or check your billing-enabled key in Settings > Secrets.',
    };
  }
  if (status === 400 || /INVALID_ARGUMENT/i.test(rawMessage)) {
    return {
      status: 400,
      message: 'Speech request could not be processed. Check your script text and try again.',
    };
  }
  return {
    status: 502,
    message: rawMessage || 'Voiceover generation failed. Please try again.',
  };
}

function describePitchDirective(pitch: number): string {
  const clamped = Math.max(-6, Math.min(6, Math.round(pitch)));
  if (clamped <= -5) return 'very deep, noticeably lower-pitched vocal register';
  if (clamped <= -3) return 'deeper, moderately lower-pitched vocal tone';
  if (clamped <= -1) return 'subtly warmer, slightly lower vocal pitch';
  if (clamped >= 5) return 'noticeably higher-pitched, lighter vocal register';
  if (clamped >= 3) return 'brighter, moderately higher-pitched vocal tone';
  if (clamped >= 1) return 'subtly brighter, slightly higher vocal pitch';
  return '';
}

function describeSpeedDirective(speed: number): string {
  const clamped = Math.max(0.7, Math.min(1.4, speed));
  if (clamped <= 0.78) return 'very slow, unhurried, deliberate speaking speed around 0.75x pace';
  if (clamped <= 0.9) return 'relaxed, measured speaking pace noticeably slower than normal';
  if (clamped >= 1.28) return 'fast, brisk speaking speed around 1.35x pace while remaining crisp';
  if (clamped >= 1.12) return 'lively, brisk speaking rate moderately faster than normal';
  return '';
}

function buildStyleString(params: {
  language: LanguageCode;
  baseStyle: string;
  gender: VoiceGender;
  toneId?: string;
  pitch?: number;
  speakingSpeed?: number;
  customNote?: string;
}): string {
  const segments: string[] = [];

  const langMeta = getLanguageByCode(params.language);
  segments.push(langMeta.styleDirective);

  const tonePreset = DELIVERY_TONES.find((t) => t.id === params.toneId);
  if (tonePreset && tonePreset.directive) {
    segments.push(tonePreset.directive);
  } else if (params.baseStyle) {
    segments.push(params.baseStyle);
  }

  segments.push(params.gender === 'female' ? 'female voice register' : 'male voice register');

  if (typeof params.pitch === 'number' && Number.isFinite(params.pitch)) {
    const pitchHint = describePitchDirective(params.pitch);
    if (pitchHint) segments.push(pitchHint);
  }

  if (typeof params.speakingSpeed === 'number' && Number.isFinite(params.speakingSpeed)) {
    const speedHint = describeSpeedDirective(params.speakingSpeed);
    if (speedHint) segments.push(speedHint);
  }

  const trimmedNote = (params.customNote || '').trim();
  if (trimmedNote) {
    segments.push(trimmedNote.slice(0, 180));
  }

  return segments.join(', ');
}

function hasExpressiveAudioTags(text: string): boolean {
  return /<(breath|laugh|gasp|sigh|chuckle)>|\|(yeah|mhm|uh-huh|right)\|/i.test(text);
}

async function generateSingleAudio(params: {
  text: string;
  voiceName: string;
  style: string;
  useFlagship?: boolean;
}): Promise<{
  audioBase64: string;
  mimeType: string;
  durationSec: number;
  byteLength: number;
  model: string;
}> {
  const ai = getGenAIClient();
  const model =
    params.useFlagship || hasExpressiveAudioTags(params.text)
      ? 'gemini-3.8-flash-tts'
      : 'gemini-3.8-flash-lite-tts';

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: params.text,
              ...(params.style
                ? {
                    speechMetadata: {
                      style: params.style,
                    },
                  }
                : {}),
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: params.voiceName,
            },
          },
        },
      },
    })
  );

  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const audioBase64 = inlineData?.data;
  if (!audioBase64) {
    throw new Error('The speech model returned no audio data for this script.');
  }

  const wavBuffer = Buffer.from(audioBase64, 'base64');
  return {
    audioBase64,
    mimeType: inlineData?.mimeType || 'audio/wav',
    durationSec: calculateWavDurationSec(wavBuffer),
    byteLength: wavBuffer.length,
    model,
  };
}

async function generateDialogueAudio(params: {
  lines: Array<{ speaker: 'A' | 'B'; text: string }>;
  voiceA: { name: string; style: string };
  voiceB: { name: string; style: string };
}): Promise<{
  audioBase64: string;
  mimeType: string;
  durationSec: number;
  byteLength: number;
  model: string;
}> {
  const ai = getGenAIClient();
  const model = 'gemini-3.8-flash-tts';

  const parts = params.lines.map((line) => {
    const speakerTag = line.speaker === 'A' ? 'SpeakerA' : 'SpeakerB';
    const speakerStyle = line.speaker === 'A' ? params.voiceA.style : params.voiceB.style;
    return {
      text: `${speakerTag}: ${line.text.trim()}`,
      speechMetadata: {
        speaker: speakerTag,
        ...(speakerStyle ? { style: speakerStyle } : {}),
      },
    };
  });

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'SpeakerA',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: params.voiceA.name },
                },
              },
              {
                speaker: 'SpeakerB',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: params.voiceB.name },
                },
              },
            ],
          },
        },
      },
    })
  );

  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  const audioBase64 = inlineData?.data;
  if (!audioBase64) {
    throw new Error('The speech model returned no audio data for this dialogue.');
  }

  const wavBuffer = Buffer.from(audioBase64, 'base64');
  return {
    audioBase64,
    mimeType: inlineData?.mimeType || 'audio/wav',
    durationSec: calculateWavDurationSec(wavBuffer),
    byteLength: wavBuffer.length,
    model,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/voices', (req: Request, res: Response) => {
    const langQuery = typeof req.query.language === 'string' ? req.query.language : '';
    const voices = langQuery
      ? VOICE_SAMPLES.filter((v) => v.language === langQuery)
      : VOICE_SAMPLES;

    res.json({
      languages: SUPPORTED_LANGUAGES,
      voices: voices.map((voice) => ({
        ...voice,
        sampleCached: sampleAudioCache.has(voice.id),
      })),
    });
  });

  app.get('/api/tts/sample/:voiceId', async (req: Request, res: Response) => {
    const voiceId = String(req.params.voiceId || '');
    const preset = getVoicePresetById(voiceId);
    if (!preset) {
      res.status(404).json({ error: 'Predefined voice sample not found.' });
      return;
    }

    const cached = sampleAudioCache.get(voiceId);
    if (cached) {
      res.json({
        voiceId,
        ...cached,
        cached: true,
      });
      return;
    }

    try {
      let pending = sampleInFlight.get(voiceId);
      if (!pending) {
        pending = (async () => {
          const sampleStyle = buildStyleString({
            language: preset.language,
            baseStyle: preset.defaultStyle,
            gender: preset.gender,
          });
          const generated = await generateSingleAudio({
            text: preset.sampleText,
            voiceName: preset.prebuiltVoice,
            style: sampleStyle,
          });
          const entry: CachedSample = {
            audioBase64: generated.audioBase64,
            durationSec: generated.durationSec,
            byteLength: generated.byteLength,
            mimeType: generated.mimeType,
          };
          sampleAudioCache.set(voiceId, entry);
          return entry;
        })().finally(() => {
          sampleInFlight.delete(voiceId);
        });
        sampleInFlight.set(voiceId, pending);
      }

      const result = await pending;
      res.json({
        voiceId,
        ...result,
        cached: false,
      });
    } catch (err) {
      console.error(`Sample TTS error (${voiceId}):`, err);
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/tts/generate', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        mode?: 'single' | 'dialogue';
        language?: LanguageCode;
        text?: string;
        voiceId?: string;
        secondaryVoiceId?: string;
        toneId?: string;
        pitch?: number;
        speakingSpeed?: number;
        customDirection?: string;
        dialogue?: Array<{ speaker: 'A' | 'B'; text: string }>;
      };

      const mode = body.mode === 'dialogue' ? 'dialogue' : 'single';
      const primaryVoice = getVoicePresetById(String(body.voiceId || ''));
      if (!primaryVoice) {
        res.status(400).json({ error: 'Please select a valid predefined voice.' });
        return;
      }

      const targetLanguage = body.language
        ? getLanguageByCode(body.language).code
        : primaryVoice.language;

      const pitch =
        typeof body.pitch === 'number' && Number.isFinite(body.pitch)
          ? Math.max(-6, Math.min(6, Math.round(body.pitch)))
          : 0;

      const speakingSpeed =
        typeof body.speakingSpeed === 'number' && Number.isFinite(body.speakingSpeed)
          ? Math.max(0.7, Math.min(1.4, Number(body.speakingSpeed.toFixed(2))))
          : 1.0;

      if (mode === 'single') {
        const cleanText = String(body.text || '').trim();
        if (!cleanText) {
          res.status(400).json({ error: 'Enter script text before generating audio.' });
          return;
        }
        if (cleanText.length > MAX_SCRIPT_CHARS) {
          res.status(400).json({
            error: `Script exceeds the ${MAX_SCRIPT_CHARS.toLocaleString()} character limit per take.`,
          });
          return;
        }

        const style = buildStyleString({
          language: targetLanguage,
          baseStyle: primaryVoice.defaultStyle,
          gender: primaryVoice.gender,
          toneId: body.toneId,
          pitch,
          speakingSpeed,
          customNote: body.customDirection,
        });

        const result = await generateSingleAudio({
          text: cleanText,
          voiceName: primaryVoice.prebuiltVoice,
          style,
        });

        res.json({
          ...result,
          language: targetLanguage,
          voiceId: primaryVoice.id,
          voiceLabel: primaryVoice.name,
          pitch,
          speakingSpeed,
          mode: 'single',
        });
        return;
      }

      const secondaryVoice = getVoicePresetById(String(body.secondaryVoiceId || ''));
      if (!secondaryVoice) {
        res.status(400).json({ error: 'Please select a valid second voice for dialogue mode.' });
        return;
      }

      const rawLines = Array.isArray(body.dialogue) ? body.dialogue : [];
      const cleanedLines = rawLines
        .map((line) => ({
          speaker: (line.speaker === 'B' ? 'B' : 'A') as 'A' | 'B',
          text: String(line.text || '').trim(),
        }))
        .filter((line) => line.text.length > 0);

      if (cleanedLines.length === 0) {
        res.status(400).json({ error: 'Add at least one line of dialogue before generating.' });
        return;
      }

      const totalLength = cleanedLines.reduce((sum, l) => sum + l.text.length, 0);
      if (totalLength > MAX_SCRIPT_CHARS) {
        res.status(400).json({
          error: `Dialogue exceeds the ${MAX_SCRIPT_CHARS.toLocaleString()} character limit per take.`,
        });
        return;
      }

      const styleA = buildStyleString({
        language: targetLanguage,
        baseStyle: primaryVoice.defaultStyle,
        gender: primaryVoice.gender,
        toneId: body.toneId,
        pitch,
        speakingSpeed,
        customNote: body.customDirection,
      });

      const styleB = buildStyleString({
        language: targetLanguage,
        baseStyle: secondaryVoice.defaultStyle,
        gender: secondaryVoice.gender,
        toneId: body.toneId,
        pitch,
        speakingSpeed,
        customNote: body.customDirection,
      });

      const result = await generateDialogueAudio({
        lines: cleanedLines,
        voiceA: { name: primaryVoice.prebuiltVoice, style: styleA },
        voiceB: { name: secondaryVoice.prebuiltVoice, style: styleB },
      });

      res.json({
        ...result,
        language: targetLanguage,
        voiceId: primaryVoice.id,
        secondaryVoiceId: secondaryVoice.id,
        voiceLabel: `${primaryVoice.name} & ${secondaryVoice.name}`,
        pitch,
        speakingSpeed,
        mode: 'dialogue',
      });
    } catch (err) {
      console.error('TTS generate error:', err);
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Ensure unknown /api routes always return JSON rather than SPA HTML
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // JSON error handler for malformed JSON bodies or unexpected Express errors
  app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    res.status(400).json({ error: message });
  });

  const isProduction =
    process.env.NODE_ENV === 'production' || path.basename(__filename) === 'server.js';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cadence Studio server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Cadence Studio server:', err);
  process.exit(1);
});
