import { useMemo, useState } from 'react';
import { Play, Square, Loader2, Search, Check } from 'lucide-react';
import {
  VOICE_SAMPLES,
  getLanguageByCode,
  type GenderFilter,
  type LanguageCode,
  type VoiceCategory,
  type VoiceSamplePreset,
} from '../shared/voices';
import { VoiceAvatar } from './VoiceAvatar';

interface VoiceRosterPanelProps {
  mode: 'single' | 'dialogue';
  language: LanguageCode;
  genderFilter: GenderFilter;
  onChangeGenderFilter: (gender: GenderFilter) => void;
  selectedVoiceId: string;
  secondaryVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  onSelectSecondaryVoice: (voiceId: string) => void;
  auditioningVoiceId: string | null;
  loadingSampleId: string | null;
  auditionProgress: number;
  onToggleAudition: (voice: VoiceSamplePreset) => void;
}

const CATEGORIES: Array<'All' | VoiceCategory> = [
  'All',
  'Narration',
  'Commercial',
  'Dialogue',
  'Calm',
];

const GENDER_OPTIONS: Array<{ id: GenderFilter; label: string }> = [
  { id: 'all', label: 'All Voices' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

export function VoiceRosterPanel({
  mode,
  language,
  genderFilter,
  onChangeGenderFilter,
  selectedVoiceId,
  secondaryVoiceId,
  onSelectVoice,
  onSelectSecondaryVoice,
  auditioningVoiceId,
  loadingSampleId,
  auditionProgress,
  onToggleAudition,
}: VoiceRosterPanelProps) {
  const [category, setCategory] = useState<'All' | VoiceCategory>('All');
  const [query, setQuery] = useState('');

  const languageMeta = getLanguageByCode(language);

  const languageVoices = useMemo(
    () => VOICE_SAMPLES.filter((voice) => voice.language === language),
    [language]
  );

  const filteredVoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return languageVoices.filter((voice) => {
      if (genderFilter !== 'all' && voice.gender !== genderFilter) return false;
      if (category !== 'All' && voice.category !== category) return false;
      if (!q) return true;
      return (
        voice.name.toLowerCase().includes(q) ||
        voice.role.toLowerCase().includes(q) ||
        voice.timbre.toLowerCase().includes(q) ||
        voice.bestFor.toLowerCase().includes(q)
      );
    });
  }, [languageVoices, genderFilter, category, query]);

  return (
    <aside
      aria-label="Predefined voice samples"
      className="flex flex-col border-t xl:border-t-0 xl:border-l border-slate-200 bg-white xl:w-[376px] shrink-0 min-h-0"
    >
      <div className="px-5 pt-5 pb-4 border-b border-slate-200 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 tracking-tight">
              Predefined Voices
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {languageMeta.name} · {languageMeta.nativeName}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
            {filteredVoices.length} of {languageVoices.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, role, or tone..."
            className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Gender Segmented Filter */}
        <div
          role="radiogroup"
          aria-label="Filter voices by gender"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {GENDER_OPTIONS.map((opt) => {
            const active = genderFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChangeGenderFilter(opt.id)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter voices by style"
          className="flex items-center gap-1 overflow-x-auto pb-0.5"
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable voice sample rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredVoices.length === 0 ? (
          <div className="px-5 py-10 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">
              No matching {languageMeta.name} presets
            </p>
            <button
              type="button"
              onClick={() => {
                setCategory('All');
                setQuery('');
                onChangeGenderFilter('all');
              }}
              className="text-xs font-medium text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              Reset voice filters
            </button>
          </div>
        ) : (
          filteredVoices.map((voice) => {
            const isPrimary = selectedVoiceId === voice.id;
            const isSecondary = mode === 'dialogue' && secondaryVoiceId === voice.id;
            const isAuditioning = auditioningVoiceId === voice.id;
            const isLoading = loadingSampleId === voice.id;

            return (
              <div
                key={voice.id}
                className={`relative px-5 py-3.5 transition-colors ${
                  isPrimary || isSecondary ? 'bg-slate-50/90' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectVoice(voice.id)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer group focus-visible:outline-none"
                  >
                    <VoiceAvatar
                      src={voice.avatarUrl}
                      name={voice.name}
                      initials={voice.initials}
                      size="md"
                    />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-700">
                          {voice.name}
                        </span>
                        {mode === 'single' && isPrimary && (
                          <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 truncate mt-0.5">{voice.role}</p>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {voice.gender === 'female' ? 'Female' : 'Male'} · {voice.timbre}
                      </p>
                    </div>
                  </button>

                  {/* Audition Sample Control */}
                  <button
                    type="button"
                    onClick={() => onToggleAudition(voice)}
                    disabled={isLoading}
                    aria-label={
                      isAuditioning
                        ? `Stop ${voice.name} sample`
                        : `Audition ${voice.name} sample`
                    }
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isAuditioning
                        ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAuditioning ? (
                      <Square className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Dual-speaker A/B slot controls */}
                {mode === 'dialogue' && (
                  <div className="mt-2.5 pl-14 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectVoice(voice.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isPrimary
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Speaker A
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectSecondaryVoice(voice.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSecondary
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Speaker B
                    </button>
                  </div>
                )}

                {isAuditioning && (
                  <div className="mt-2.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-[width] duration-100"
                      style={{ width: `${Math.max(4, Math.round(auditionProgress * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
