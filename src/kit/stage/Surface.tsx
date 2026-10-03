import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useSurface } from './useSurface';
import type { SurfaceOptions } from '../gpu/Renderer';

type SurfaceProps<E extends React.ElementType> = {
  as?: E;
  surface: SurfaceOptions | null;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'surface'>;

// Loose internal props; the exported signature below carries the precise polymorphic types.
interface SurfaceImplProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  surface: SurfaceOptions | null;
}

function SurfaceImpl({ as, surface, ...rest }: SurfaceImplProps, forwarded: React.ForwardedRef<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useImperativeHandle(forwarded, () => ref.current!);
  useSurface(ref, surface);
  const Tag = as ?? 'div';
  return <Tag ref={ref} {...rest} />;
}

/** Any element with a GPU surface behind its content. */
export const Surface = forwardRef(SurfaceImpl) as <E extends React.ElementType = 'div'>(
  props: SurfaceProps<E> & { ref?: React.Ref<HTMLElement> }
) => React.ReactElement | null;
