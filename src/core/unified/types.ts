import { ShaderPreset } from '../types';

export interface RegisteredElement {
  id: string;
  element: HTMLElement;
  shader: ShaderPreset | 'custom';
  customFragmentShader?: string;
  uniforms?: Record<string, number | number[]>;
  cornerRadius: number;
  speed: number;
  opacity: number;
  isHovered: boolean;
  isActive: boolean;
  mousePos: [number, number];
  // Internal animation state
  hoverLerp: number;
  activeLerp: number;
  time: number;
}
