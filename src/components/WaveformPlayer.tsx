import { useEffect, useRef, useState, useCallback, type PointerEvent } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  AudioLines,
} from 'lucide-react';
import type { StudioTake } from '../lib/takesStore';
import {
  extractWaveformPeaks,
  formatTimecode,
  formatByteSize,
  downloadBlob,
  sanitizeFilename,
} from '../lib/audioUtils';

interface WaveformPlayerProps {
  take: StudioTake | null;
  isGenerating: boolean;
  onPlaybackStart?: () => void;
  externalPauseSignal: number;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

export function WaveformPlayer({
  take,
  isGenerating,
  onPlaybackStart,
  externalPauseSignal,
}: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);

  // Create/revoke object URL and extract peaks when active take changes
  useEffect(() => {
    if (!take) {
      setAudioUrl(null);
      setPeaks([]);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const url = URL.createObjectURL(take.audioBlob);
    setAudioUrl(url);
    setCurrentTime(0);
    setDuration(take.durationSec);
    setIsPlaying(false);

    let cancelled = false;
    extractWaveformPeaks(take.audioBlob, 104).then((extracted) => {
      if (!cancelled) setPeaks(extracted);
    });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [take]);

  // Pause master player when a voice sample audition starts
  useEffect(() => {
    if (externalPauseSignal > 0 && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [externalPauseSignal]);

  // Sync audio element playback rate & volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, audioUrl]);

  // Smooth animation loop while playing for fluid playhead rendering
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      if (audioRef.current && !isScrubbing) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isScrubbing]);

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  // Render crisp retina canvas waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = waveformContainerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const bars = peaks.length > 0 ? peaks : Array.from({ length: 84 }, () => 0.12);
    const gap = 2.5;
    const barWidth = Math.max(1.5, (width - gap * (bars.length - 1)) / bars.length);
    const centerY = height / 2;
    const maxBarHeight = height - 10;

    for (let i = 0; i < bars.length; i++) {
      const x = i * (barWidth + gap);
      const barProgress = (i + 0.5) / bars.length;
      const barHeight = Math.max(3, bars[i] * maxBarHeight);
      const y = centerY - barHeight / 2;

      if (take && barProgress <= progress) {
        ctx.fillStyle = '#0f172a';
      } else if (take && hoverProgress !== null && barProgress <= hoverProgress) {
        ctx.fillStyle = '#94a3b8';
      } else {
        ctx.fillStyle = '#cbd5e1';
      }

      ctx.beginPath();
      const radius = Math.min(1.5, barWidth / 2);
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
    }

    // Active Broadcast Vermilion playhead
    if (take && duration > 0) {
      const playheadX = Math.max(1, Math.min(width - 1, progress * width));
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(playheadX - 1, 2, 2, height - 4);
    }

    ctx.restore();
  }, [peaks, progress, hoverProgress, take, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const container = waveformContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => drawWaveform());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawWaveform]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !take) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      onPlaybackStart?.();
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio || !take) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const seekFromClientX = (clientX: number) => {
    const container = waveformContainerRef.current;
    const audio = audioRef.current;
    if (!container || !audio || !take || duration <= 0) return;
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!take) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    seekFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const container = waveformContainerRef.current;
    if (!container || !take) return;
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverProgress(ratio);
    if (isScrubbing) {
      seekFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsScrubbing(false);
    }
  };

  const cycleRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
  };

  const handleDownload = () => {
    if (!take) return;
    const filename = `${sanitizeFilename(take.title)}.wav`;
    downloadBlob(take.audioBlob, filename);
  };

  return (
    <section
      aria-label="Master audio player"
      className="border-t border-slate-200 bg-white px-5 py-4 lg:px-7"
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const mediaDuration = e.currentTarget.duration;
            if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
              setDuration(mediaDuration);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(duration);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      {!take ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <AudioLines className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {isGenerating ? 'Synthesizing studio master...' : 'Ready for voiceover render'}
              </p>
              <p className="text-xs text-slate-500">
                {isGenerating
                  ? 'Rendering 24 kHz 16-bit WAV audio from your script'
                  : 'Select a predefined voice and generate audio to preview the waveform and export WAV.'}
              </p>
            </div>
          </div>
          <div className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
            00:00 / 00:00
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top row: Take info + download action */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex items-baseline gap-2.5">
              <h3 className="text-sm font-semibold text-slate-900 truncate max-w-[260px] sm:max-w-[380px]">
                {take.title}
              </h3>
              <span className="text-xs text-slate-500 whitespace-nowrap">
                {take.voiceLabel}
              </span>
              <span className="text-xs text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                24 kHz WAV · {formatByteSize(take.byteLength)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={cycleRate}
                aria-label="Change playback speed"
                className="h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono font-medium text-slate-700 tabular-nums transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {playbackRate.toFixed(playbackRate % 1 === 0 ? 1 : 2)}×
              </button>

              <div className="hidden sm:flex items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(Number(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  aria-label="Volume"
                  className="studio-slider w-16"
                />
              </div>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download WAV
              </button>
            </div>
          </div>

          {/* Bottom row: Transport + Interactive Waveform + Timecode */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause voiceover' : 'Play voiceover'}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleRestart}
                aria-label="Restart take from beginning"
                className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              ref={waveformContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => setHoverProgress(null)}
              role="slider"
              aria-label="Audio playback timeline"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              tabIndex={0}
              onKeyDown={(e) => {
                const audio = audioRef.current;
                if (!audio || duration <= 0) return;
                if (e.key === 'ArrowRight') {
                  audio.currentTime = Math.min(duration, audio.currentTime + 2);
                  setCurrentTime(audio.currentTime);
                } else if (e.key === 'ArrowLeft') {
                  audio.currentTime = Math.max(0, audio.currentTime - 2);
                  setCurrentTime(audio.currentTime);
                } else if (e.key === ' ') {
                  e.preventDefault();
                  togglePlay();
                }
              }}
              className="relative flex-1 h-12 rounded-md bg-slate-50 border border-slate-200/80 px-2 py-1 cursor-pointer select-none touch-none overflow-hidden focus-visible:outline-2 focus-visible:outline-slate-900"
            >
              <canvas ref={canvasRef} className="w-full h-full block" />
              {hoverProgress !== null && duration > 0 && (
                <div
                  className="pointer-events-none absolute top-1 px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] tabular-nums -translate-x-1/2"
                  style={{ left: `${Math.min(94, Math.max(6, hoverProgress * 100))}%` }}
                >
                  {formatTimecode(hoverProgress * duration)}
                </div>
              )}
            </div>

            <div className="font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap shrink-0 min-w-[84px] text-right">
              <span className="text-slate-900 font-medium">{formatTimecode(currentTime)}</span>
              <span className="text-slate-400"> / {formatTimecode(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
