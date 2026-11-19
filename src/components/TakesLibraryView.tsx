import { useMemo, useState } from 'react';
import {
  Play,
  Download,
  Trash2,
  Search,
  Pencil,
  Check,
  X,
  FileEdit,
  AudioLines,
} from 'lucide-react';
import type { StudioTake } from '../lib/takesStore';
import { getLanguageByCode } from '../shared/voices';
import {
  formatTimecode,
  formatByteSize,
  downloadBlob,
  sanitizeFilename,
} from '../lib/audioUtils';

interface TakesLibraryViewProps {
  takes: StudioTake[];
  isLoading: boolean;
  activeTakeId: string | null;
  onSelectTake: (take: StudioTake) => void;
  onLoadIntoStudio: (take: StudioTake) => void;
  onRenameTake: (id: string, title: string) => void;
  onDeleteTake: (id: string) => void;
  onGoToStudio: () => void;
}

function formatShortDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function TakesLibraryView({
  takes,
  isLoading,
  activeTakeId,
  onSelectTake,
  onLoadIntoStudio,
  onRenameTake,
  onDeleteTake,
  onGoToStudio,
}: TakesLibraryViewProps) {
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'single' | 'dialogue'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const filteredTakes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return takes.filter((take) => {
      if (modeFilter !== 'all' && take.mode !== modeFilter) return false;
      if (!q) return true;
      return (
        take.title.toLowerCase().includes(q) ||
        take.voiceLabel.toLowerCase().includes(q) ||
        take.scriptText.toLowerCase().includes(q)
      );
    });
  }, [takes, query, modeFilter]);

  const startRename = (take: StudioTake) => {
    setEditingId(take.id);
    setDraftTitle(take.title);
  };

  const commitRename = (id: string) => {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      onRenameTake(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-7 lg:px-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-display font-semibold tracking-tight text-slate-900">
              Takes Library
            </h1>
            <p className="text-sm text-slate-600">
              Rendered voiceovers saved locally in this browser. Replay, reload into the editor, or
              export WAV files.
            </p>
          </div>
          <div className="font-mono text-xs text-slate-500 tabular-nums shrink-0">
            {takes.length} {takes.length === 1 ? 'take' : 'takes'} stored
          </div>
        </div>

        {/* Search & Filter Row */}
        {takes.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
              {(
                [
                  { id: 'all', label: 'All Takes' },
                  { id: 'single', label: 'Single Voice' },
                  { id: 'dialogue', label: 'Dialogue' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModeFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    modeFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, voice, or script..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-slate-200/80 rounded animate-pulse" />
                  <div className="h-3 w-72 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : takes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center space-y-4">
            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
              <AudioLines className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-display font-semibold text-slate-900">
                No voiceover takes yet
              </h2>
              <p className="text-sm text-slate-500">
                Write or paste a script in the studio, pick one of the predefined voices, and
                render your first WAV voiceover.
              </p>
            </div>
            <button
              type="button"
              onClick={onGoToStudio}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              Open Voiceover Studio
            </button>
          </div>
        ) : filteredTakes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center space-y-2">
            <p className="text-sm font-medium text-slate-800">No takes match your filter.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setModeFilter('all');
              }}
              className="text-xs font-medium text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-slate-50/70">
                  <th className="py-3 pl-5 pr-3 font-medium">Take &amp; Script Excerpt</th>
                  <th className="py-3 px-3 font-medium">Voice</th>
                  <th className="py-3 px-3 font-medium text-right">Duration</th>
                  <th className="py-3 px-3 font-medium text-right">Size</th>
                  <th className="py-3 px-3 font-medium text-right">Recorded</th>
                  <th className="py-3 pl-3 pr-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTakes.map((take) => {
                  const isActive = take.id === activeTakeId;
                  const isEditing = editingId === take.id;

                  return (
                    <tr
                      key={take.id}
                      className={`transition-colors ${
                        isActive ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-3 max-w-[300px]">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(take.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="h-7 px-2 rounded border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-slate-900 w-48"
                            />
                            <button
                              type="button"
                              onClick={() => commitRename(take.id)}
                              aria-label="Save title"
                              className="p-1 text-slate-700 hover:text-slate-900 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel rename"
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onSelectTake(take)}
                              className="text-sm font-semibold text-slate-900 hover:underline truncate block max-w-full text-left cursor-pointer"
                            >
                              {take.title}
                            </button>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {take.scriptText}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">{take.voiceLabel}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {getLanguageByCode(take.language || 'en-US').shortCode} ·{' '}
                          {(take.speakingSpeed ?? 1).toFixed(2)}× ·{' '}
                          {(take.pitch ?? 0) > 0
                            ? `+${take.pitch}`
                            : `${take.pitch ?? 0}`}{' '}
                          st
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatTimecode(take.durationSec)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatByteSize(take.byteLength)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatShortDate(take.createdAt)}
                      </td>

                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectTake(take)}
                            title="Load in audio player"
                            aria-label={`Play ${take.title}`}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onLoadIntoStudio(take)}
                            title="Load script & voice into Studio"
                            aria-label={`Edit ${take.title} in studio`}
                            className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startRename(take)}
                            title="Rename take"
                            aria-label={`Rename ${take.title}`}
                            className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadBlob(take.audioBlob, `${sanitizeFilename(take.title)}.wav`)
                            }
                            title="Download WAV"
                            aria-label={`Download ${take.title}`}
                            className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTake(take.id)}
                            title="Delete take"
                            aria-label={`Delete ${take.title}`}
                            className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
