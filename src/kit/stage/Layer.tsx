import React, { forwardRef, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayerContext, StageContext } from './context';
import { DRAWABLE_CHILD_ATTRS } from '../gpu/htmlInCanvas';
import type { LayerHandle } from '../gpu/Renderer';
import { cn } from '../util';

export interface LayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'> {
  /** Paint order. Higher layers can refract everything below them. */
  z?: number;
  /** Composite this layer's HTML (false for pure-shader layers such as backgrounds). */
  content?: boolean;
  opacity?: number;
  /** Render into the stage canvas from anywhere in the tree (overlays). */
  portal?: boolean;
  /**
   * Size the layer to the whole stage (default). Canvas children are forced to
   * `position: static` and each is laid out independently at the canvas origin, so
   * `absolute`/`inset` do nothing; full layers use width/height 100% instead.
   */
  fill?: boolean;
  /**
   * Viewport position for overlays. Canvas children always lay out at the canvas origin
   * (positioning and margins don't move them) but CSS transforms do apply, to hit testing and
   * getBoundingClientRect alike, so `at` becomes a translate. Verified in Chrome 154.
   */
  at?: { left: number; top: number };
}

/**
 * A drawable child of the stage canvas. Its HTML is laid out, hit-tested and accessible as
 * normal, but pixels come from the GPU: surfaces first, then the HTML snapshot composited
 * through the content effects. Layers must be direct children of the canvas; use `portal`
 * for overlays rendered from deep in the tree.
 */
export const Layer = forwardRef<HTMLDivElement, LayerProps>(function Layer(
  { z = 0, content = true, opacity = 1, portal = false, fill = true, at, className, style, children, ...rest },
  forwarded
) {
  const { renderer, canvas } = useContext(StageContext);
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwarded, () => ref.current!);
  const handle = useRef<LayerHandle | null>(null);
  const [registered, setRegistered] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!renderer || !el) return;
    const h = renderer.addLayer(el, { z, content, opacity });
    handle.current = h;
    setRegistered(el);
    return () => {
      h.remove();
      handle.current = null;
      setRegistered(null);
    };
    // z/content/opacity are pushed by the effect below without re-registering.
  }, [renderer]);

  useEffect(() => {
    handle.current?.update({ z, content, opacity });
  }, [z, content, opacity]);

  const node = (
    <div
      ref={ref}
      {...DRAWABLE_CHILD_ATTRS}
      className={cn('block', fill && 'h-full w-full', className)}
      style={at ? { transform: `translate(${at.left}px, ${at.top}px)`, ...style } : style}
      {...rest}
    >
      <LayerContext.Provider value={registered}>{children}</LayerContext.Provider>
    </div>
  );

  if (portal) return canvas ? createPortal(node, canvas) : null;
  return node;
});
