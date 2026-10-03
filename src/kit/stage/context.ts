import { createContext, useContext } from 'react';
import type { Renderer } from '../gpu/Renderer';

export interface StageValue {
  renderer: Renderer | null;
  /** The drawable canvas. Overlay layers portal into it (they must be direct children). */
  canvas: HTMLCanvasElement | null;
}

export const StageContext = createContext<StageValue>({ renderer: null, canvas: null });

/** The registered layer element surfaces attach to (null until the layer is registered). */
export const LayerContext = createContext<HTMLElement | null>(null);

export const useStage = () => useContext(StageContext);
