import type { LanguageCode } from '../shared/voices';

export function base64ToWavBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Extracts normalized amplitude peaks (0.08..1.0) directly from a 16-bit PCM WAV Blob.
 * Instant, deterministic, and independent of browser AudioContext gesture locks.
 */
export async function extractWaveformPeaks(blob: Blob, barCount = 96): Promise<number[]> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (arrayBuffer.byteLength <= 48) {
      return Array.from({ length: barCount }, () => 0.18);
    }

    const view = new DataView(arrayBuffer);
    let dataOffset = 44;
    let dataBytes = arrayBuffer.byteLength - 44;

    // Locate the 'data' subchunk if RIFF WAV header is present
    const riff =
      String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      ) === 'RIFF';

    if (riff) {
      let offset = 12;
      while (offset + 8 <= arrayBuffer.byteLength) {
        const id = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );
        const size = view.getUint32(offset + 4, true);
        if (id === 'data') {
          dataOffset = offset + 8;
          dataBytes = Math.min(size, arrayBuffer.byteLength - dataOffset);
          break;
        }
        offset += 8 + size + (size % 2);
      }
    }

    const totalSamples = Math.floor(dataBytes / 2);
    if (totalSamples < barCount) {
      return Array.from({ length: barCount }, () => 0.2);
    }

    const samplesPerBar = Math.floor(totalSamples / barCount);
    const step = Math.max(1, Math.floor(samplesPerBar / 64));
    const rawPeaks: number[] = [];
    let maxPeak = 0.001;

    for (let i = 0; i < barCount; i++) {
      const startSample = i * samplesPerBar;
      const endSample = Math.min(totalSamples, startSample + samplesPerBar);
      let sumSquares = 0;
      let count = 0;

      for (let s = startSample; s < endSample; s += step) {
        const byteIdx = dataOffset + s * 2;
        if (byteIdx + 1 >= arrayBuffer.byteLength) break;
        const sample = view.getInt16(byteIdx, true) / 32768;
        sumSquares += sample * sample;
        count++;
      }

      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      rawPeaks.push(rms);
      if (rms > maxPeak) maxPeak = rms;
    }

    return rawPeaks.map((rms) => {
      const normalized = Math.pow(rms / maxPeak, 0.72);
      return Math.max(0.08, Math.min(1, normalized));
    });
  } catch {
    return Array.from({ length: barCount }, () => 0.25);
  }
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function countWords(text: string): number {
  const cleaned = text.replace(/<[^>]+>|\|[^|]+\|/g, ' ').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function estimateDurationSeconds(
  text: string,
  speakingSpeed = 1.0,
  language: LanguageCode = 'en-US'
): number {
  const cleaned = text.replace(/<[^>]+>|\|[^|]+\|/g, '').trim();
  if (!cleaned) return 0;
  const speed = Math.max(0.7, Math.min(1.4, speakingSpeed || 1.0));
  if (language === 'ja-JP') {
    const chars = cleaned.replace(/\s+/g, '').length;
    const charsPerSec = 5.6 * speed;
    return Math.max(1, Math.round(chars / charsPerSec));
  }
  const words = countWords(cleaned);
  if (words === 0) return 0;
  const wpm = 148 * speed;
  return Math.max(1, Math.round((words / wpm) * 60));
}

export function formatByteSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sanitizeFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'voiceover-take'
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
