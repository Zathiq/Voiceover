import { Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import type { DialogueTurn } from '../lib/takesStore';
import type { VoiceSamplePreset } from '../shared/voices';
import { VoiceAvatar } from './VoiceAvatar';

interface DualDialogueEditorProps {
  turns: DialogueTurn[];
  voiceA: VoiceSamplePreset;
  voiceB: VoiceSamplePreset;
  isRtl?: boolean;
  onChangeTurns: (next: DialogueTurn[]) => void;
  onSwapVoices: () => void;
}

const EXPRESSIVE_CUES = [
  { label: 'Breath', token: '<breath>' },
  { label: 'Laugh', token: '<laugh>' },
  { label: 'Gasp', token: '<gasp>' },
  { label: 'Yeah', token: '|yeah|' },
  { label: 'Mhm', token: '|mhm|' },
];

export function DualDialogueEditor({
  turns,
  voiceA,
  voiceB,
  isRtl = false,
  onChangeTurns,
  onSwapVoices,
}: DualDialogueEditorProps) {
  const handleTurnTextChange = (id: string, text: string) => {
    onChangeTurns(turns.map((t) => (t.id === id ? { ...t, text } : t)));
  };

  const handleToggleSpeaker = (id: string) => {
    onChangeTurns(
      turns.map((t) => (t.id === id ? { ...t, speaker: t.speaker === 'A' ? 'B' : 'A' } : t))
    );
  };

  const handleAppendCue = (id: string, token: string) => {
    onChangeTurns(
      turns.map((t) => {
        if (t.id !== id) return t;
        const spacer = t.text.length > 0 && !t.text.endsWith(' ') ? ' ' : '';
        return { ...t, text: `${t.text}${spacer}${token} ` };
      })
    );
  };

  const handleAddTurn = () => {
    const lastSpeaker = turns[turns.length - 1]?.speaker ?? 'B';
    const nextSpeaker: 'A' | 'B' = lastSpeaker === 'A' ? 'B' : 'A';
    onChangeTurns([
      ...turns,
      {
        id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        speaker: nextSpeaker,
        text: '',
      },
    ]);
  };

  const handleRemoveTurn = (id: string) => {
    if (turns.length <= 1) return;
    onChangeTurns(turns.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Cast assignment bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2.5">
            <VoiceAvatar
              src={voiceA.avatarUrl}
              name={voiceA.name}
              initials={voiceA.initials}
              size="sm"
            />
            <div>
              <p className="text-[11px] font-mono text-slate-500">Speaker A</p>
              <p className="text-sm font-semibold text-slate-900 leading-tight">{voiceA.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwapVoices}
            aria-label="Swap Speaker A and Speaker B voices"
            className="w-8 h-8 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2.5">
            <VoiceAvatar
              src={voiceB.avatarUrl}
              name={voiceB.name}
              initials={voiceB.initials}
              size="sm"
            />
            <div>
              <p className="text-[11px] font-mono text-slate-500">Speaker B</p>
              <p className="text-sm font-semibold text-slate-900 leading-tight">{voiceB.name}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Assign voices from the roster on the right
        </p>
      </div>

      {/* Turn rows */}
      <div className="space-y-3">
        {turns.map((turn, idx) => {
          const activeVoice = turn.speaker === 'A' ? voiceA : voiceB;
          return (
            <div
              key={turn.id}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleSpeaker(turn.id)}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Speaker {turn.speaker}</span>
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-600">{activeVoice.name}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="hidden sm:flex items-center gap-1">
                    {EXPRESSIVE_CUES.map((cue) => (
                      <button
                        key={cue.token}
                        type="button"
                        onClick={() => handleAppendCue(turn.id, cue.token)}
                        title={`Insert ${cue.token}`}
                        className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        +{cue.label}
                      </button>
                    ))}
                  </div>
                  {turns.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTurn(turn.id)}
                      aria-label={`Remove line ${idx + 1}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <textarea
                dir={isRtl ? 'rtl' : 'ltr'}
                value={turn.text}
                onChange={(e) => handleTurnTextChange(turn.id, e.target.value)}
                rows={2}
                placeholder={`Write line for ${activeVoice.name}...`}
                className="w-full resize-y bg-transparent text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAddTurn}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Dialogue Turn
      </button>
    </div>
  );
}
