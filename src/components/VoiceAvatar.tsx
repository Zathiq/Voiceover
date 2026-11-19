import { useState } from 'react';

interface VoiceAvatarProps {
  src: string;
  name: string;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<VoiceAvatarProps['size']>, string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
};

export function VoiceAvatar({ src, name, initials, size = 'md' }: VoiceAvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-lg bg-slate-200 text-slate-700 font-display font-semibold flex items-center justify-center select-none border border-slate-300/70`}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Studio portrait of voice talent ${name}`}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-lg object-cover object-top bg-slate-200 border border-slate-200`}
    />
  );
}
