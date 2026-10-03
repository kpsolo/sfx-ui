import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSurface } from '../stage/useSurface';
import type { SurfaceOptions } from '../gpu/Renderer';
import { cn } from '../util';

export type ButtonVariant = 'glass' | 'neon' | 'plasma' | 'solid' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const SURFACES: Record<ButtonVariant, SurfaceOptions> = {
  glass: { material: 'glass', params: [8, 10, 0.22, 12], fx: 'ripple', fxAmount: 0.7 },
  neon: { material: 'electric', fx: 'ripple', fxAmount: 0.5 },
  plasma: { material: 'plasma', fx: 'ripple', fxAmount: 0.6 },
  solid: { material: 'solid', fx: 'ripple', fxAmount: 0.4 },
  ghost: { material: 'solid', variant: 1, fx: 'ripple', fxAmount: 0.3 },
  danger: { material: 'electric', tint: 'danger', fx: 'ripple', fxAmount: 0.5 },
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Override or extend the variant's surface. */
  surface?: Partial<SurfaceOptions>;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'glass', size = 'md', surface, loading = false, className, children, disabled, ...rest },
  forwarded
) {
  const ref = useRef<HTMLButtonElement>(null);
  useImperativeHandle(forwarded, () => ref.current!);
  useSurface(ref, { ...SURFACES[variant], ...surface, intensity: disabled ? 0.4 : surface?.intensity ?? 1 });

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-medium text-sfx-text outline-none',
        'transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'danger' && 'text-red-100',
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      )}
      {children}
    </button>
  );
});
