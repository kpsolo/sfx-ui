import { RefObject, useContext, useEffect, useRef } from 'react';
import { LayerContext, StageContext } from './context';
import type { SurfaceHandle, SurfaceOptions } from '../gpu/Renderer';

/**
 * Gives an element a GPU surface. The renderer tracks its rect, hover, press, focus and pointer
 * position itself; pass `null` to remove the surface. Options are pushed on every render
 * (eased values such as `value` and `fxAmount` animate from their current state).
 */
export function useSurface(ref: RefObject<HTMLElement>, options: SurfaceOptions | null) {
  const { renderer } = useContext(StageContext);
  const layer = useContext(LayerContext);
  const handle = useRef<SurfaceHandle | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const enabled = options !== null;

  useEffect(() => {
    const el = ref.current;
    if (!renderer || !layer || !el || !latest.current) return;
    const h = renderer.addSurface(layer, el, latest.current);
    handle.current = h;
    return () => {
      h.remove();
      handle.current = null;
    };
  }, [renderer, layer, enabled, ref]);

  useEffect(() => {
    if (handle.current && options) handle.current.update(options);
  });
}
