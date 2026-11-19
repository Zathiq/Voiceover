import { useMemo, useState } from 'react';
import { Play, Square, Loader2, Search, ArrowRight, Check } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  VOICE_SAMPLES,
  getLanguageByCode,
  type GenderFilter,
  type LanguageCode,
  type VoiceCategory,
  type VoiceSamplePreset,
} from '../shared/voices';
import { VoiceAvatar } from './VoiceAvatar';

interface VoiceSamplesCatalogProps {
  activeLanguage: LanguageCode;
  selectedVoiceId: string;
  auditioningVoiceId: string | null;
  loadingSampleId: string | null;
  auditionProgress: number;
  onToggleAudition: (voice: VoiceSamplePreset) => void;
  onUseVoiceInStudio: (voice: VoiceSamplePreset) => void;
}

const CATEGORIES: Array<'All' | VoiceCategory> = [
  'All',
  'Narration',
  'Commercial',
  'Dialogue',
  'Calm',
];

const GENDER_FILTERS: Array<{ id: GenderFilter; label: string }> = [
  { id: 'all', label: 'All Genders' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

export function VoiceSamplesCatalog({
  activeLanguage,
  selectedVoiceId,
  auditioningVoiceId,
  loadingSampleId,
  auditionProgress,
  onToggleAudition,
  onUseVoiceInStudio,
}: VoiceSamplesCatalogProps) {
  const [languageFilter, setLanguageFilter] = useState<'all' | LanguageCode>(activeLanguage);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [category, setCategory] = useState<'All' | VoiceCategory>('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VOICE_SAMPLES.filter((voice) => {
      if (languageFilter !== 'all' && voice.language !== languageFilter) return false;
      if (genderFilter !== 'all' && voice.gender !== genderFilter) return false;
      if (category !== 'All' && voice.category !== category) return false;
      if (!q) return true;
      const lang = getLanguageByCode(voice.language);
      return (
        voice.name.toLowerCase().includes(q) ||
        voice.role.toLowerCase().includes(q) ||
        voice.timbre.toLowerCase().includes(q) ||
        voice.bestFor.toLowerCase().includes(q) ||
        voice.sampleText.toLowerCase().includes(q) ||
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q)
      );
    });
  }, [languageFilter, genderFilter, category, query]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-7 lg:px-10">
      <div className="max-w-5xl mx-auto space-y-7">
        {/* Header + Multi-Language & Characteristic Filters */}
        <div className="space-y-5 pb-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1.5 max-w-2xl">
              <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight text-slate-900 [text-wrap:balance]">
                Multilingual Voice Samples
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Audition predefined voice presets across {SUPPORTED_LANGUAGES.length} languages.
                Filter by language, voice gender, or delivery role before opening a voice in the
                studio.
              </p>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
              {filtered.length} of {VOICE_SAMPLES.length} samples
            </span>
          </div>

          {/* Language Selection Bar */}
          <div
            role="tablist"
            aria-label="Filter voice samples by language"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={languageFilter === 'all'}
              onClick={() => setLanguageFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                languageFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Languages
            </button>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = languageFilter === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setLanguageFilter(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {lang.name}
                  {lang.nativeName !== lang.name ? ` · ${lang.nativeName}` : ''}
                </button>
              );
            })}
          </div>

          {/* Secondary Filters: Gender + Category + Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div
                role="radiogroup"
                aria-label="Filter by gender"
                className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
              >
                {GENDER_FILTERS.map((opt) => {
                  const active = genderFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setGenderFilter(opt.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

              <div
                role="tablist"
                aria-label="Filter by category"
                className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto max-w-full"
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
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search voices or traits..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 2-Column Editorial Catalog Grid */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3 border border-slate-200 rounded-xl bg-white">
            <p className="text-sm font-medium text-slate-800">
              No voice samples match your selected filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setLanguageFilter('all');
                setGenderFilter('all');
                setCategory('All');
                setQuery('');
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Show All Voices
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((voice) => {
              const langMeta = getLanguageByCode(voice.language);
              const isSelected = voice.id === selectedVoiceId;
              const isAuditioning = auditioningVoiceId === voice.id;
              const isLoading = loadingSampleId === voice.id;

              return (
                <article
                  key={voice.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-5 transition-colors ${
                    isSelected ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <VoiceAvatar
                          src={voice.avatarUrl}
                          name={voice.name}
                          initials={voice.initials}
                          size="lg"
                        />
                        <div className="min-w-0 pt-0.5">
                          <h2 className="text-base font-display font-semibold text-slate-900 truncate">
                            {voice.name}
                          </h2>
                          <p className="text-xs font-medium text-slate-700 mt-0.5">{voice.role}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {langMeta.name} · {voice.gender === 'female' ? 'Female' : 'Male'} ·{' '}
                            {voice.timbre}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                    </div>

                    <p
                      dir={langMeta.isRtl ? 'rtl' : 'ltr'}
                      className="text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-3.5"
                    >
                      “{voice.sampleText}”
                    </p>

                    <p className="text-xs text-slate-500">
                      <span className="text-slate-700 font-medium">Best for:</span> {voice.bestFor}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                    {isAuditioning && (
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 transition-[width] duration-100"
                          style={{ width: `${Math.max(4, Math.round(auditionProgress * 100))}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleAudition(voice)}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isAuditioning
                            ? 'bg-red-600 border-red-600 text-white hover:bg-red-700'
                            : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading Sample
                          </>
                        ) : isAuditioning ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            Stop Sample
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Play Sample
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onUseVoiceInStudio(voice)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Use in Studio
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
