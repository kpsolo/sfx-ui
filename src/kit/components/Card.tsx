import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSurface } from '../stage/useSurface';
import type { SurfaceOptions } from '../gpu/Renderer';
import type { BuiltinMaterial } from '../gpu/wgsl/materials';
import type { ContentFx } from '../gpu/wgsl/content';
import { cn } from '../util';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Built-in or registered material name. */
  material?: BuiltinMaterial | (string & {});
  /** Effect applied to the card's live HTML content. */
  fx?: ContentFx;
  fxAmount?: number;
  surface?: Partial<SurfaceOptions>;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { material = 'glass', fx, fxAmount, surface, padding = 'md', className, ...rest },
  forwarded
) {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwarded, () => ref.current!);
  useSurface(ref, {
    material,
    params: material === 'glass' ? [12, 16, 0.12, 22] : undefined,
    margin: 18,
    fx,
    fxAmount,
    ...surface,
  });
  return <div ref={ref} className={cn('relative rounded-2xl text-sfx-text', PADDING[padding], className)} {...rest} />;
});
