import React, { forwardRef, useId, useRef } from 'react';
import { useSurface } from '../stage/useSurface';
import type { SurfaceOptions } from '../gpu/Renderer';
import { cn } from '../util';

const FIELD_SURFACE: SurfaceOptions = { material: 'glass', params: [6, 6, 0.32, 8], margin: 12 };

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium tracking-wide text-sfx-text/70">
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <p id={`${id}-hint`} className={cn('text-xs', error ? 'text-sfx-danger' : 'text-sfx-text/45')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, className, id: idProp, ...rest },
  ref
) {
  const auto = useId();
  const id = idProp ?? auto;
  const wrap = useRef<HTMLDivElement>(null);
  useSurface(wrap, { ...FIELD_SURFACE, tint: error ? 'danger' : undefined });
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div ref={wrap} className={cn('relative flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-sfx-text/60', className)}>
        {icon}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-hint` : undefined}
          className="h-full w-full bg-transparent text-sm text-sfx-text outline-none placeholder:text-sfx-text/35"
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id: idProp, rows = 4, ...rest },
  ref
) {
  const auto = useId();
  const id = idProp ?? auto;
  const wrap = useRef<HTMLDivElement>(null);
  useSurface(wrap, { ...FIELD_SURFACE, tint: error ? 'danger' : undefined });
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div ref={wrap} className="relative rounded-xl px-3.5 py-3">
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-hint` : undefined}
          className={cn('sfx-scroll block w-full resize-none bg-transparent text-sm text-sfx-text outline-none placeholder:text-sfx-text/35', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value !== undefined ? value : inner;
  const set = (v: T) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  return [current, set] as const;
}

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, defaultChecked = false, onChange, label, description, disabled, className }: SwitchProps) {
  const [on, setOn] = useControllable(checked, defaultChecked, onChange);
  const ref = useRef<HTMLButtonElement>(null);
  const descId = useId();
  useSurface(ref, { material: 'switch', value: on ? 1 : 0, margin: 14, intensity: disabled ? 0.45 : 1 });
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-start gap-3', disabled && 'cursor-not-allowed', className)}>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => setOn(!on)}
        className="relative h-7 w-12 shrink-0 rounded-full outline-none"
      />
      {(label || description) && (
        <span className="pt-0.5">
          {label && <span className="block text-sm font-medium text-sfx-text">{label}</span>}
          {description && (
            <span id={descId} className="block text-xs text-sfx-text/50">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  label?: string;
  format?: (value: number) => React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Slider({ value, defaultValue = 50, min = 0, max = 100, step = 1, onChange, label, format, disabled, className }: SliderProps) {
  const [v, setV] = useControllable(value, defaultValue, onChange);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useSurface(ref, { material: 'slider', value: (v - min) / (max - min || 1), margin: 16, intensity: disabled ? 0.45 : 1 });
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-baseline justify-between text-xs">
          <label htmlFor={id} className="font-medium tracking-wide text-sfx-text/70">
            {label}
          </label>
          <span className="font-mono text-sfx-primary">{format ? format(v) : v}</span>
        </div>
      )}
      <div ref={ref} className="relative h-7 rounded-full">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          disabled={disabled}
          onChange={(e) => setV(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, defaultChecked = false, onChange, label, disabled, className }: CheckboxProps) {
  const [on, setOn] = useControllable(checked, defaultChecked, onChange);
  const ref = useRef<HTMLSpanElement>(null);
  useSurface(ref, { material: 'check', value: on ? 1 : 0, margin: 10, intensity: disabled ? 0.45 : 1 });
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-3 text-sm text-sfx-text', disabled && 'cursor-not-allowed', className)}>
      <span ref={ref} className="relative h-5 w-5 shrink-0 rounded-md">
        <input
          type="checkbox"
          checked={on}
          disabled={disabled}
          onChange={(e) => setOn(e.target.checked)}
          className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
      {label}
    </label>
  );
}
