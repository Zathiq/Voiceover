import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  Library,
  AudioLines,
  Play,
  Square,
  Loader2,
  AlertCircle,
  X,
  Menu,
  RotateCcw,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  VOICE_SAMPLES,
  DELIVERY_TONES,
  SCRIPT_TEMPLATES,
  getLanguageByCode,
  getVoicePresetById,
  getVoicesByLanguage,
  formatPitchLabel,
  formatSpeedLabel,
  type GenderFilter,
  type LanguageCode,
  type ScriptTemplate,
  type VoiceSamplePreset,
} from './shared/voices';
import {
  base64ToWavBlob,
  countWords,
  estimateDurationSeconds,
  formatTimecode,
} from './lib/audioUtils';
import {
  loadAllTakes,
  saveTake,
  updateTakeTitle,
  deleteTakeById,
  type DialogueTurn,
  type StudioTake,
} from './lib/takesStore';
import { VoiceAvatar } from './components/VoiceAvatar';
import { VoiceRosterPanel } from './components/VoiceRosterPanel';
import { WaveformPlayer } from './components/WaveformPlayer';
import { VoiceSamplesCatalog } from './components/VoiceSamplesCatalog';
import { TakesLibraryView } from './components/TakesLibraryView';
import { DualDialogueEditor } from './components/DualDialogueEditor';

type ActiveSection = 'studio' | 'samples' | 'library';

const MAX_CHARS = 4000;

const SPEED_QUICK_PRESETS = [
  { label: '0.75×', value: 0.75 },
  { label: '1.0×', value: 1.0 },
  { label: '1.25×', value: 1.25 },
];

const GENDER_CONTROLS: Array<{ id: GenderFilter; label: string }> = [
  { id: 'all', label: 'Any' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

function createDialogueTurnsFromLanguage(language: LanguageCode): DialogueTurn[] {
  const langMeta = getLanguageByCode(language);
  return langMeta.dialogueStarter.map((line, idx) => ({
    id: `turn-${language}-${idx}-${Date.now()}`,
    speaker: line.speaker,
    text: line.text,
  }));
}

async function safeReadJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      response.ok
        ? 'Received an unexpected non-JSON response from the server.'
        : `Server returned status ${response.status}. Please try again.`
    );
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('studio');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Language & Script configuration
  const [language, setLanguage] = useState<LanguageCode>('en-US');
  const [mode, setMode] = useState<'single' | 'dialogue'>('single');
  const [scriptText, setScriptText] = useState<string>(SUPPORTED_LANGUAGES[0].starterScript);
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>(() =>
    createDialogueTurnsFromLanguage('en-US')
  );

  // Voice & Characteristics configuration
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICE_SAMPLES[0].id);
  const [secondaryVoiceId, setSecondaryVoiceId] = useState<string>(VOICE_SAMPLES[2].id);
  const [toneId, setToneId] = useState<string>('default');
  const [pitch, setPitch] = useState<number>(0); // -6 to +6 semitones
  const [speakingSpeed, setSpeakingSpeed] = useState<number>(1.0); // 0.70 to 1.40
  const [customDirection, setCustomDirection] = useState<string>('');

  // Generation & Takes state
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [takes, setTakes] = useState<StudioTake[]>([]);
  const [isLoadingTakes, setIsLoadingTakes] = useState(true);
  const [activeTake, setActiveTake] = useState<StudioTake | null>(null);

  // Sample Audition playback state (coordinated with master player)
  const auditionAudioRef = useRef<HTMLAudioElement | null>(null);
  const auditionUrlRef = useRef<string | null>(null);
  const sampleBlobCacheRef = useRef<Map<string, Blob>>(new Map());
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [auditionProgress, setAuditionProgress] = useState(0);
  const [masterPauseSignal, setMasterPauseSignal] = useState(0);

  const activeLanguageMeta = useMemo(() => getLanguageByCode(language), [language]);

  const selectedVoice = useMemo(
    () => getVoicePresetById(selectedVoiceId) ?? getVoicesByLanguage(language)[0] ?? VOICE_SAMPLES[0],
    [selectedVoiceId, language]
  );

  const secondaryVoice = useMemo(
    () =>
      getVoicePresetById(secondaryVoiceId) ??
      getVoicesByLanguage(language)[1] ??
      VOICE_SAMPLES[2],
    [secondaryVoiceId, language]
  );

  // Load persisted takes from IndexedDB on startup
  useEffect(() => {
    let active = true;
    loadAllTakes()
      .then((stored) => {
        if (!active) return;
        setTakes(stored);
        if (stored.length > 0) {
          setActiveTake(stored[0]);
        }
      })
      .finally(() => {
        if (active) setIsLoadingTakes(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stopAudition = useCallback(() => {
    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
      auditionAudioRef.current.currentTime = 0;
      auditionAudioRef.current = null;
    }
    if (auditionUrlRef.current) {
      URL.revokeObjectURL(auditionUrlRef.current);
      auditionUrlRef.current = null;
    }
    setAuditioningVoiceId(null);
    setAuditionProgress(0);
  }, []);

  useEffect(() => {
    return () => stopAudition();
  }, [stopAudition]);

  useEffect(() => {
    if (!auditioningVoiceId) return;
    let rafId = 0;
    const update = () => {
      const audio = auditionAudioRef.current;
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        setAuditionProgress(Math.min(1, audio.currentTime / audio.duration));
      }
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [auditioningVoiceId]);

  const handleLanguageChange = useCallback(
    (nextLang: LanguageCode) => {
      if (nextLang === language) return;
      stopAudition();
      setErrorMessage(null);

      // Check if user still has an untouched default starter script
      const isUntouchedStarter = SUPPORTED_LANGUAGES.some(
        (l) => l.starterScript.trim() === scriptText.trim()
      );
      const isUntouchedDialogue = SUPPORTED_LANGUAGES.some(
        (l) =>
          l.dialogueStarter.length === dialogueTurns.length &&
          l.dialogueStarter.every((line, i) => line.text === dialogueTurns[i]?.text)
      );

      const nextLangMeta = getLanguageByCode(nextLang);
      const langVoices = getVoicesByLanguage(nextLang);
      const genderMatched =
        genderFilter === 'all'
          ? langVoices
          : langVoices.filter((v) => v.gender === genderFilter);

      const primaryCandidate = genderMatched[0] ?? langVoices[0] ?? VOICE_SAMPLES[0];
      const secondaryCandidate =
        langVoices.find((v) => v.id !== primaryCandidate.id && v.gender !== primaryCandidate.gender) ??
        langVoices.find((v) => v.id !== primaryCandidate.id) ??
        primaryCandidate;

      setLanguage(nextLang);
      setSelectedVoiceId(primaryCandidate.id);
      setSecondaryVoiceId(secondaryCandidate.id);

      if (isUntouchedStarter || scriptText.trim().length === 0) {
        setScriptText(nextLangMeta.starterScript);
      }
      if (isUntouchedDialogue) {
        setDialogueTurns(createDialogueTurnsFromLanguage(nextLang));
      }
    },
    [language, genderFilter, scriptText, dialogueTurns, stopAudition]
  );

  const handleGenderFilterChange = useCallback(
    (nextGender: GenderFilter) => {
      setGenderFilter(nextGender);
      if (nextGender === 'all') return;
      const langVoices = getVoicesByLanguage(language);
      const currentMatches = selectedVoice.language === language && selectedVoice.gender === nextGender;
      if (!currentMatches) {
        const match = langVoices.find((v) => v.gender === nextGender);
        if (match) {
          setSelectedVoiceId(match.id);
        }
      }
    },
    [language, selectedVoice]
  );

  const handleToggleAudition = useCallback(
    async (voice: VoiceSamplePreset) => {
      setErrorMessage(null);
      if (auditioningVoiceId === voice.id) {
        stopAudition();
        return;
      }

      stopAudition();
      setMasterPauseSignal((n) => n + 1);

      try {
        let blob = sampleBlobCacheRef.current.get(voice.id);
        if (!blob) {
          setLoadingSampleId(voice.id);
          const response = await fetch(`/api/tts/sample/${encodeURIComponent(voice.id)}`);
          const payload = await safeReadJson<{
            audioBase64?: string;
            mimeType?: string;
            error?: string;
          }>(response);
          if (!response.ok || !payload.audioBase64) {
            throw new Error(payload.error || 'Unable to load predefined voice sample.');
          }
          blob = base64ToWavBlob(payload.audioBase64, payload.mimeType || 'audio/wav');
          sampleBlobCacheRef.current.set(voice.id, blob);
        }

        const url = URL.createObjectURL(blob);
        auditionUrlRef.current = url;
        const audio = new Audio(url);
        auditionAudioRef.current = audio;

        audio.onended = () => {
          stopAudition();
        };
        audio.onerror = () => {
          stopAudition();
          setErrorMessage('Audio playback could not start for this sample.');
        };

        setAuditioningVoiceId(voice.id);
        await audio.play();
      } catch (err) {
        stopAudition();
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to audition predefined voice sample.'
        );
      } finally {
        setLoadingSampleId(null);
      }
    },
    [auditioningVoiceId, stopAudition]
  );

  // Computed metrics for the active script
  const combinedScriptText = useMemo(() => {
    if (mode === 'single') return scriptText;
    return dialogueTurns.map((t) => t.text).join(' ');
  }, [mode, scriptText, dialogueTurns]);

  const wordCount = useMemo(() => countWords(combinedScriptText), [combinedScriptText]);
  const charCount = useMemo(() => combinedScriptText.trim().length, [combinedScriptText]);
  const estDurationSec = useMemo(
    () => estimateDurationSeconds(combinedScriptText, speakingSpeed, language),
    [combinedScriptText, speakingSpeed, language]
  );

  const hasCustomCharacteristics = pitch !== 0 || speakingSpeed !== 1.0 || toneId !== 'default';

  const canGenerate = useMemo(() => {
    if (isGenerating) return false;
    if (charCount === 0 || charCount > MAX_CHARS) return false;
    return true;
  }, [isGenerating, charCount]);

  const handleGenerateVoiceover = async () => {
    if (!canGenerate) return;
    setErrorMessage(null);
    stopAudition();
    setIsGenerating(true);

    try {
      const payload =
        mode === 'single'
          ? {
              mode: 'single',
              language,
              text: scriptText.trim(),
              voiceId: selectedVoice.id,
              toneId,
              pitch,
              speakingSpeed,
              customDirection: customDirection.trim(),
            }
          : {
              mode: 'dialogue',
              language,
              voiceId: selectedVoice.id,
              secondaryVoiceId: secondaryVoice.id,
              toneId,
              pitch,
              speakingSpeed,
              customDirection: customDirection.trim(),
              dialogue: dialogueTurns
                .filter((t) => t.text.trim().length > 0)
                .map((t) => ({ speaker: t.speaker, text: t.text.trim() })),
            };

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await safeReadJson<{
        audioBase64?: string;
        mimeType?: string;
        durationSec?: number;
        byteLength?: number;
        voiceLabel?: string;
        error?: string;
      }>(response);

      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'Voiceover generation failed.');
      }

      const wavBlob = base64ToWavBlob(data.audioBase64, data.mimeType || 'audio/wav');
      const nextTakeNumber = takes.length + 1;
      const snippet = combinedScriptText
        .replace(/<[^>]+>|\|[^|]+\|/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .join(' ');

      const newTake: StudioTake = {
        id: `take-${Date.now()}`,
        title: `Take ${String(nextTakeNumber).padStart(2, '0')} — ${snippet || selectedVoice.name}`,
        mode,
        language,
        scriptText:
          mode === 'single'
            ? scriptText.trim()
            : dialogueTurns
                .filter((t) => t.text.trim())
                .map(
                  (t) =>
                    `${t.speaker === 'A' ? selectedVoice.name : secondaryVoice.name}: ${t.text.trim()}`
                )
                .join(' / '),
        dialogueLines:
          mode === 'dialogue'
            ? dialogueTurns
                .filter((t) => t.text.trim())
                .map((t) => ({ speaker: t.speaker, text: t.text.trim() }))
            : undefined,
        voiceId: selectedVoice.id,
        voiceLabel: data.voiceLabel || selectedVoice.name,
        secondaryVoiceId: mode === 'dialogue' ? secondaryVoice.id : undefined,
        toneId,
        pitch,
        speakingSpeed,
        customDirection: customDirection.trim(),
        durationSec: data.durationSec ?? estDurationSec,
        byteLength: data.byteLength ?? wavBlob.size,
        createdAt: Date.now(),
        audioBlob: wavBlob,
      };

      await saveTake(newTake);
      setTakes((prev) => [newTake, ...prev]);
      setActiveTake(newTake);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to generate voiceover audio right now.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyTemplate = (template: ScriptTemplate) => {
    setErrorMessage(null);
    setLanguage(template.language);
    setGenderFilter('all');
    setSelectedVoiceId(template.recommendedVoiceId);
    if (template.mode === 'dialogue' && template.dialogue) {
      setMode('dialogue');
      if (template.secondaryVoiceId) {
        setSecondaryVoiceId(template.secondaryVoiceId);
      }
      setDialogueTurns(
        template.dialogue.map((line, i) => ({
          id: `tpl-${template.id}-${i}-${Date.now()}`,
          speaker: line.speaker,
          text: line.text,
        }))
      );
    } else {
      setMode('single');
      setScriptText(template.text ?? '');
    }
    setActiveSection('studio');
    setMobileNavOpen(false);
  };

  const handleUseVoiceFromCatalog = (voice: VoiceSamplePreset) => {
    const prevLang = language;
    setLanguage(voice.language);
    setGenderFilter('all');
    setSelectedVoiceId(voice.id);

    // Ensure secondary voice belongs to same language for dual mode
    const langVoices = getVoicesByLanguage(voice.language);
    const altVoice = langVoices.find((v) => v.id !== voice.id) ?? voice;
    setSecondaryVoiceId(altVoice.id);

    if (prevLang !== voice.language) {
      const isUntouchedStarter = SUPPORTED_LANGUAGES.some(
        (l) => l.starterScript.trim() === scriptText.trim()
      );
      if (isUntouchedStarter || scriptText.trim().length === 0) {
        setScriptText(getLanguageByCode(voice.language).starterScript);
      }
    }
    setActiveSection('studio');
  };

  const handleLoadTakeIntoStudio = (take: StudioTake) => {
    const takeLang = take.language || getVoicePresetById(take.voiceId)?.language || 'en-US';
    setLanguage(takeLang);
    setGenderFilter('all');
    setSelectedVoiceId(take.voiceId);
    if (take.mode === 'dialogue' && take.dialogueLines && take.dialogueLines.length > 0) {
      setMode('dialogue');
      if (take.secondaryVoiceId) setSecondaryVoiceId(take.secondaryVoiceId);
      setDialogueTurns(
        take.dialogueLines.map((line, idx) => ({
          id: `loaded-${take.id}-${idx}`,
          speaker: line.speaker,
          text: line.text,
        }))
      );
    } else {
      setMode('single');
      setScriptText(take.scriptText);
    }
    setToneId(take.toneId || 'default');
    setPitch(typeof take.pitch === 'number' ? take.pitch : 0);
    setSpeakingSpeed(typeof take.speakingSpeed === 'number' ? take.speakingSpeed : 1.0);
    setCustomDirection(take.customDirection || '');
    setActiveTake(take);
    setActiveSection('studio');
  };

  const handleRenameTake = async (id: string, title: string) => {
    await updateTakeTitle(id, title);
    setTakes((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    setActiveTake((prev) => (prev && prev.id === id ? { ...prev, title } : prev));
  };

  const handleDeleteTake = async (id: string) => {
    await deleteTakeById(id);
    setTakes((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (activeTake?.id === id) {
        setActiveTake(remaining[0] ?? null);
      }
      return remaining;
    });
  };

  const handleResetCharacteristics = () => {
    setToneId('default');
    setPitch(0);
    setSpeakingSpeed(1.0);
    setGenderFilter('all');
  };

  const breadcrumbLabel =
    activeSection === 'studio'
      ? `Voiceover Studio / ${activeLanguageMeta.name} · ${mode === 'dialogue' ? 'Dual Dialogue' : 'Single Voice'}`
      : activeSection === 'samples'
        ? 'Voiceover Studio / Multilingual Voice Samples'
        : 'Voiceover Studio / Takes Library';

  const isPrimaryAuditioning = auditioningVoiceId === selectedVoice.id;
  const isPrimaryLoading = loadingSampleId === selectedVoice.id;

  return (
    <div className="min-h-screen h-screen flex bg-slate-50 text-slate-900 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar Navigation (256px desktop) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[256px] shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col min-h-0">
          {/* Single-element Brand Wordmark */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveSection('studio');
                setMobileNavOpen(false);
              }}
              className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cadence Studio
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Workspace Links */}
          <nav aria-label="Workspace sections" className="p-3 space-y-1">
            {(
              [
                { id: 'studio', label: 'Voiceover Studio', icon: Mic },
                {
                  id: 'samples',
                  label: 'Voice Samples',
                  icon: AudioLines,
                  count: VOICE_SAMPLES.length,
                },
                { id: 'library', label: 'Takes Library', icon: Library, count: takes.length },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {'count' in item && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        active ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Starter Scripts */}
          <div className="px-4 pt-5 pb-3 border-t border-slate-100 mt-2 overflow-y-auto">
            <p className="px-1.5 text-xs font-medium text-slate-500 mb-2.5">
              Quick Script Starters
            </p>
            <div className="space-y-1">
              {SCRIPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="text-xs font-medium text-slate-800 group-hover:text-slate-950 truncate">
                    {tpl.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {tpl.category} · {tpl.mode === 'dialogue' ? '2 voices' : '1 voice'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quiet Active Voice Footer Anchor */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <VoiceAvatar
              src={selectedVoice.avatarUrl}
              name={selectedVoice.name}
              initials={selectedVoice.initials}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {selectedVoice.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {activeLanguageMeta.shortCode} · {selectedVoice.gender === 'female' ? 'Female' : 'Male'} · {speakingSpeed.toFixed(2)}×
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleAudition(selectedVoice)}
              disabled={isPrimaryLoading}
              aria-label={`Audition ${selectedVoice.name}`}
              className={`w-8 h-8 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                isPrimaryAuditioning
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPrimaryLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPrimaryAuditioning ? (
                <Square className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Bar Contract: Contextual Breadcrumb (left) + 1 Primary Action (right) */}
        <header className="h-14 px-5 lg:px-7 bg-white border-b border-slate-200 flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 -ml-1.5 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-600 truncate">
              {breadcrumbLabel}
            </span>
          </div>

          <div className="shrink-0">
            {activeSection === 'studio' ? (
              <button
                type="button"
                onClick={handleGenerateVoiceover}
                disabled={!canGenerate}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Audio...
                  </>
                ) : (
                  'Generate Voiceover'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveSection('studio')}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Studio
              </button>
            )}
          </div>
        </header>

        {/* Inline Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="px-5 lg:px-7 py-2.5 bg-red-50 border-b border-red-200 flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
              className="p-1 text-red-600 hover:text-red-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active View Surface */}
        {activeSection === 'studio' && (
          <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden">
            {/* Script Editor & Voice Customization Stage */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
              <div className="flex-1 px-5 py-6 lg:px-8 lg:py-7 max-w-4xl w-full mx-auto space-y-6">
                {/* Mode, Language Selector & Live Metrics Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setMode('single')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          mode === 'single'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Single Voice
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('dialogue')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          mode === 'dialogue'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Dual Dialogue
                      </button>
                    </div>

                    {/* Language Dropdown Selector */}
                    <div className="relative flex items-center">
                      <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
                      <label htmlFor="studio-language-select" className="sr-only">
                        Output Language
                      </label>
                      <select
                        id="studio-language-select"
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                        className="h-9 pl-8.5 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 hover:border-slate-300 focus:outline-none focus:border-slate-400 transition-colors cursor-pointer"
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                            {lang.nativeName !== lang.name ? ` (${lang.nativeName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Live Script Readout (Tabular Numerals) */}
                  <div className="flex items-center gap-3 font-mono text-xs text-slate-500 tabular-nums">
                    <span>{wordCount} words</span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className={charCount > MAX_CHARS ? 'text-red-600 font-medium' : ''}>
                      {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-800 font-medium">
                      ~{formatTimecode(estDurationSec)} est.
                    </span>
                  </div>
                </div>

                {/* Primary Script Input Area */}
                {mode === 'single' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <VoiceAvatar
                          src={selectedVoice.avatarUrl}
                          name={selectedVoice.name}
                          initials={selectedVoice.initials}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-slate-900 truncate">
                              {selectedVoice.name}
                            </span>
                            <span className="text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs text-slate-500 truncate">
                              {selectedVoice.role} ·{' '}
                              {selectedVoice.gender === 'female' ? 'Female' : 'Male'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAudition(selectedVoice)}
                          disabled={isPrimaryLoading}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            isPrimaryAuditioning
                              ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isPrimaryLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isPrimaryAuditioning ? (
                            <Square className="w-3 h-3 fill-current" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          {isPrimaryAuditioning ? 'Stop Sample' : 'Hear Sample'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setScriptText(activeLanguageMeta.starterScript)}
                          className="inline-flex items-center h-8 px-2.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Load {activeLanguageMeta.shortCode} Sample
                        </button>

                        {scriptText.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setScriptText('')}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white focus-within:border-slate-400 transition-colors">
                      <label htmlFor="voiceover-script" className="sr-only">
                        Voiceover script
                      </label>
                      <textarea
                        id="voiceover-script"
                        dir={activeLanguageMeta.isRtl ? 'rtl' : 'ltr'}
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                        rows={7}
                        placeholder={`Type or paste your ${activeLanguageMeta.name} script to convert into audio...`}
                        className="w-full p-5 bg-transparent text-[15px] leading-[1.7] text-slate-900 placeholder:text-slate-400 resize-y min-h-[190px] focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <DualDialogueEditor
                    turns={dialogueTurns}
                    voiceA={selectedVoice}
                    voiceB={secondaryVoice}
                    isRtl={Boolean(activeLanguageMeta.isRtl)}
                    onChangeTurns={setDialogueTurns}
                    onSwapVoices={() => {
                      const prevA = selectedVoiceId;
                      setSelectedVoiceId(secondaryVoiceId);
                      setSecondaryVoiceId(prevA);
                    }}
                  />
                )}

                {/* Voice Characteristics Customization Section */}
                <div className="pt-5 border-t border-slate-200 space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                      <h2 className="text-sm font-display font-semibold text-slate-900">
                        Voice Characteristics
                      </h2>
                    </div>

                    {hasCustomCharacteristics && (
                      <button
                        type="button"
                        onClick={handleResetCharacteristics}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset defaults
                      </button>
                    )}
                  </div>

                  {/* Row 1: Pitch Slider + Speaking Speed Slider + Voice Gender Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Pitch Control (-6 to +6 semitones) */}
                    <div className="md:col-span-4 space-y-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <label
                          htmlFor="pitch-slider"
                          className="text-xs font-medium text-slate-700"
                        >
                          Pitch
                        </label>
                        <span className="font-mono text-xs text-slate-900 tabular-nums">
                          {formatPitchLabel(pitch)}
                        </span>
                      </div>
                      <input
                        id="pitch-slider"
                        type="range"
                        min={-6}
                        max={6}
                        step={1}
                        value={pitch}
                        onChange={(e) => setPitch(Number(e.target.value))}
                        className="studio-slider w-full"
                      />
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setPitch(-4)}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          Deep (-4)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPitch(0)}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          0 st
                        </button>
                        <button
                          type="button"
                          onClick={() => setPitch(4)}
                          className="hover:text-slate-700 cursor-pointer"
                        >
                          Bright (+4)
                        </button>
                      </div>
                    </div>

                    {/* Speaking Speed Control (0.70x to 1.40x) */}
                    <div className="md:col-span-5 space-y-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <label
                          htmlFor="speed-slider"
                          className="text-xs font-medium text-slate-700"
                        >
                          Speaking Speed
                        </label>
                        <span className="font-mono text-xs text-slate-900 tabular-nums">
                          {formatSpeedLabel(speakingSpeed)}
                        </span>
                      </div>
                      <input
                        id="speed-slider"
                        type="range"
                        min={0.7}
                        max={1.4}
                        step={0.05}
                        value={speakingSpeed}
                        onChange={(e) => setSpeakingSpeed(Number(e.target.value))}
                        className="studio-slider w-full"
                      />
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums">
                        {SPEED_QUICK_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setSpeakingSpeed(preset.value)}
                            className={`transition-colors cursor-pointer ${
                              Math.abs(speakingSpeed - preset.value) < 0.01
                                ? 'text-slate-900 font-medium'
                                : 'hover:text-slate-700'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Gender Selector */}
                    <div className="md:col-span-3 space-y-2">
                      <span className="block text-xs font-medium text-slate-700">
                        Voice Gender
                      </span>
                      <div
                        role="radiogroup"
                        aria-label="Select voice gender"
                        className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
                      >
                        {GENDER_CONTROLS.map((opt) => {
                          const active = genderFilter === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => handleGenderFilterChange(opt.id)}
                              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                active
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Delivery Tone Presets */}
                  <div className="space-y-2">
                    <span className="block text-xs font-medium text-slate-700">
                      Delivery Tone
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DELIVERY_TONES.map((tone) => {
                        const active = toneId === tone.id;
                        return (
                          <button
                            key={tone.id}
                            type="button"
                            onClick={() => setToneId(tone.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {tone.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 3: Custom Vocal Direction Note + Primary Action */}
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1">
                    <div className="flex-1 space-y-1.5">
                      <label
                        htmlFor="custom-direction"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Director Note (optional)
                      </label>
                      <input
                        id="custom-direction"
                        type="text"
                        value={customDirection}
                        onChange={(e) => setCustomDirection(e.target.value)}
                        maxLength={180}
                        placeholder="e.g., Warm slight smile on the opening line, pause gently before the final sentence"
                        className="w-full h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateVoiceover}
                      disabled={!canGenerate}
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rendering WAV...
                        </>
                      ) : (
                        'Generate Voiceover'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </main>

            {/* Right-Hand Predefined Voice Samples Inspector (filtered by active language + gender) */}
            <VoiceRosterPanel
              mode={mode}
              language={language}
              genderFilter={genderFilter}
              onChangeGenderFilter={handleGenderFilterChange}
              selectedVoiceId={selectedVoiceId}
              secondaryVoiceId={secondaryVoiceId}
              onSelectVoice={setSelectedVoiceId}
              onSelectSecondaryVoice={setSecondaryVoiceId}
              auditioningVoiceId={auditioningVoiceId}
              loadingSampleId={loadingSampleId}
              auditionProgress={auditionProgress}
              onToggleAudition={handleToggleAudition}
            />
          </div>
        )}

        {activeSection === 'samples' && (
          <VoiceSamplesCatalog
            activeLanguage={language}
            selectedVoiceId={selectedVoiceId}
            auditioningVoiceId={auditioningVoiceId}
            loadingSampleId={loadingSampleId}
            auditionProgress={auditionProgress}
            onToggleAudition={handleToggleAudition}
            onUseVoiceInStudio={handleUseVoiceFromCatalog}
          />
        )}

        {activeSection === 'library' && (
          <TakesLibraryView
            takes={takes}
            isLoading={isLoadingTakes}
            activeTakeId={activeTake?.id ?? null}
            onSelectTake={setActiveTake}
            onLoadIntoStudio={handleLoadTakeIntoStudio}
            onRenameTake={handleRenameTake}
            onDeleteTake={handleDeleteTake}
            onGoToStudio={() => setActiveSection('studio')}
          />
        )}

        {/* Persistent Master Audio Waveform Bar */}
        <WaveformPlayer
          take={activeTake}
          isGenerating={isGenerating}
          onPlaybackStart={stopAudition}
          externalPauseSignal={masterPauseSignal}
        />
      </div>
    </div>
  );
}
