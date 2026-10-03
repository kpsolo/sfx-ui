import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { useSurface } from '../stage/useSurface';
import { cn } from '../util';

export type Tone = 'primary' | 'accent' | 'success' | 'danger' | 'neutral';

const TONE_TINT: Record<Tone, string> = {
  primary: 'primary',
  accent: 'accent',
  success: 'success',
  danger: 'danger',
  neutral: 'text',
};

const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-sfx-primary',
  accent: 'text-sfx-accent',
  success: 'text-sfx-success',
  danger: 'text-sfx-danger',
  neutral: 'text-sfx-text/80',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

export function Badge({ tone = 'primary', dot, className, children, ...rest }: BadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useSurface(ref, { material: 'pill', tint: TONE_TINT[tone], margin: 8 });
  return (
    <span
      ref={ref}
      className={cn('relative inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium', TONE_TEXT[tone], className)}
      {...rest}
    >
      {/* Static on purpose: any CSS animation inside a layer re-rasterizes the whole layer every frame. */}
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  tone?: Tone;
  className?: string;
}

export function Progress({ value, max = 100, label, tone = 'primary', className }: ProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const ratio = Math.min(Math.max(value / max, 0), 1);
  useSurface(ref, { material: 'progress', value: ratio, tint: TONE_TINT[tone], margin: 10 });
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex justify-between text-xs">
          <span id={id} className="font-medium text-sfx-text/70">
            {label}
          </span>
          <span className="font-mono text-sfx-primary">{Math.round(ratio * 100)}%</span>
        </div>
      )}
      <div
        ref={ref}
        role="progressbar"
        aria-labelledby={label ? id : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2.5 rounded-full"
      />
    </div>
  );
}

export interface AvatarProps {
  name: string;
  /** Same-origin image URL (cross-origin images are not drawn by HTML-in-Canvas). */
  src?: string;
  size?: number;
  status?: 'online' | 'busy' | 'offline';
}

const STATUS = { online: 'bg-sfx-success', busy: 'bg-sfx-danger', offline: 'bg-sfx-text/40' };

export function Avatar({ name, src, size = 44, status }: AvatarProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useSurface(ref, { material: 'ring', margin: 12 });
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span ref={ref} className="relative inline-grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="h-[calc(100%-8px)] w-[calc(100%-8px)] rounded-full object-cover" />
      ) : (
        <span aria-label={name} role="img" className="text-sm font-semibold text-sfx-text">
          {initials}
        </span>
      )}
      {status && (
        <span
          aria-label={status}
          role="status"
          className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-sfx-bg', STATUS[status])}
        />
      )}
    </span>
  );
}

export interface TabItem {
  id: string;
  label: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  className?: string;
}

/** Tab list with a liquid GPU indicator that stretches as it travels. */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [geom, setGeom] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabRefs.current.get(value);
      if (tab) setGeom({ left: tab.offsetLeft, width: tab.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [value, items]);

  useSurface(listRef, { material: 'indicator', value: geom.left, params: [geom.left, geom.width, 0, 0], margin: 10 });

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === value);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const item = items[(next + items.length) % items.length];
    onChange(item.id);
    tabRefs.current.get(item.id)?.focus();
  };

  return (
    <div ref={listRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('relative inline-flex rounded-xl p-1', className)}>
      {items.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            if (el) tabRefs.current.set(t.id, el);
            else tabRefs.current.delete(t.id);
          }}
          role="tab"
          type="button"
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium outline-none transition-colors',
            t.id === value ? 'text-sfx-text' : 'text-sfx-text/50 hover:text-sfx-text/80'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
