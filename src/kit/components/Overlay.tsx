import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Layer } from '../stage/Layer';
import { Surface } from '../stage/Surface';
import { useSurface } from '../stage/useSurface';
import { cn } from '../util';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

/** Keeps an overlay mounted while its exit animation plays. */
function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, shown };
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Dialog on its own layer: a frost scrim that blurs and refracts the real page below,
 * and a glass panel that dissolves in and out.
 */
export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  const { mounted, shown } = usePresence(open, 520);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel.current)?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;
  return (
    <Layer portal z={50} onKeyDown={onKeyDown}>
      <div className="relative grid h-full w-full place-items-center p-6">
      <Surface
        aria-hidden
        className="absolute inset-0"
        onClick={onClose}
        surface={{ material: 'frost', value: shown ? 1 : 0, margin: 0 }}
      />
      <Surface
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn('relative w-full max-w-md rounded-3xl p-7 text-sfx-text outline-none', className)}
        surface={{ material: 'glass', params: [16, 22, 0.16, 26], margin: 24, fx: 'dissolve', fxAmount: shown ? 0 : 1 }}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-1.5 text-sm text-sfx-text/60">
            {description}
          </p>
        )}
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </Surface>
      </div>
    </Layer>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SelectProps<T extends string> {
  label?: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Listbox select; the popup is a glass layer that refracts the page beneath it. */
export function Select<T extends string>({ label, hideLabel, options, value, onChange, className }: SelectProps<T>) {
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const id = useId();
  useSurface(trigger, { material: 'glass', params: [6, 6, 0.32, 8], margin: 12 });

  const current = options.find((o) => o.value === value);

  const openList = useCallback(() => {
    if (!trigger.current) return;
    setRect(trigger.current.getBoundingClientRect());
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [options, value]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !trigger.current?.contains(t)) close(false);
    };
    const onScroll = () => close(false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  const choose = (i: number) => {
    onChange(options[i].value);
    close();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, options.length - 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape' || e.key === 'Tab') close(e.key === 'Escape');
    else return;
    e.preventDefault();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <span id={`${id}-label`} className={cn('block text-xs font-medium tracking-wide text-sfx-text/70', hideLabel && 'sr-only')}>
          {label}
        </span>
      )}
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
        className="relative flex h-11 w-full items-center justify-between rounded-xl px-3.5 text-left text-sm text-sfx-text outline-none"
      >
        <span id={`${id}-value`}>{current?.label}</span>
        <svg aria-hidden viewBox="0 0 20 20" className={cn('h-4 w-4 text-sfx-text/50 transition-transform', open && 'rotate-180')}>
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {open && rect && (
        <Layer portal z={40} fill={false} className="p-3" at={{ left: rect.left - 12, top: rect.bottom - 6 }} style={{ width: rect.width + 24 }}>
          <Surface
            ref={list}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={label ? `${id}-label` : undefined}
            aria-activedescendant={`${id}-opt-${active}`}
            onKeyDown={onListKey}
            className="relative rounded-2xl p-1.5 outline-none"
            surface={{ material: 'glass', params: [12, 14, 0.25, 16], margin: 12 }}
          >
            {options.map((o, i) => (
              <Surface
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
                className="relative flex h-9 cursor-pointer items-center justify-between rounded-lg px-3 text-sm text-sfx-text"
                surface={{ material: 'solid', variant: i === active ? 0 : 1, tint: 'surface', margin: 4 }}
              >
                {o.label}
                {o.value === value && <span className="text-sfx-primary">✓</span>}
              </Surface>
            ))}
          </Surface>
        </Layer>
      )}
    </div>
  );
}

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

/** Hologram tooltip on its own layer, shown on hover and keyboard focus. */
export function Tooltip({ content, children }: TooltipProps) {
  const anchor = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => anchor.current && setAnchorRect(anchor.current.getBoundingClientRect()), 120);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setAnchorRect(null);
    setPos(null);
  };

  useLayoutEffect(() => {
    if (!anchorRect || !layer.current) return;
    const r = layer.current.getBoundingClientRect();
    setPos({ left: anchorRect.left + anchorRect.width / 2 - r.width / 2, top: anchorRect.top - r.height + 2 });
  }, [anchorRect]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <span
        ref={anchor}
        className="inline-flex"
        aria-describedby={anchorRect ? id : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => e.key === 'Escape' && hide()}
      >
        {children}
      </span>
      {anchorRect && (
        <Layer
          ref={layer}
          portal
          z={60}
          fill={false}
          className="pointer-events-none w-max p-2"
          at={pos ?? { left: 0, top: 0 }}
          style={pos ? undefined : { visibility: 'hidden' }}
        >
          <Surface
            id={id}
            role="tooltip"
            className="relative max-w-xs rounded-lg px-2.5 py-1.5 text-xs text-sfx-text"
            surface={{ material: 'hologram', margin: 6 }}
          >
            {content}
          </Surface>
        </Layer>
      )}
    </>
  );
}
