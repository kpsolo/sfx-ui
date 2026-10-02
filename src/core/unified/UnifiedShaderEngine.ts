import { ShaderEngine } from '../ShaderEngine';
import { SHADER_PRESETS } from '../../shaders/presets';
import { RegisteredElement } from './types';
import { lerp } from '../utils';

export class UnifiedShaderEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private engine: ShaderEngine;
  private elements = new Map<string, RegisteredElement>();
  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    }) || canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });

    if (!gl) {
      throw new Error('UnifiedShaderEngine: Unable to initialize WebGL');
    }

    this.gl = gl;
    this.engine = new ShaderEngine(gl);
    this.start();
  }

  public register(item: Omit<RegisteredElement, 'hoverLerp' | 'activeLerp' | 'time'>) {
    this.elements.set(item.id, {
      ...item,
      hoverLerp: item.isHovered ? 1.0 : 0.0,
      activeLerp: item.isActive ? 1.0 : 0.0,
      time: 0,
    });
  }

  public update(id: string, updates: Partial<RegisteredElement>) {
    const existing = this.elements.get(id);
    if (existing) {
      Object.assign(existing, updates);
    }
  }

  public unregister(id: string) {
    this.elements.delete(id);
  }

  public resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * dpr);
    const height = Math.floor(window.innerHeight * dpr);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (now: number) => {
      this.animationFrameId = requestAnimationFrame(loop);
      this.render(now);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private render(now: number) {
    const gl = this.gl;
    if (gl.isContextLost()) return;

    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Clear whole screen
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.SCISSOR_TEST);

    const windowH = window.innerHeight;
    const windowW = window.innerWidth;

    for (const item of this.elements.values()) {
      if (!item.element.isConnected) {
        this.elements.delete(item.id);
        continue;
      }

      const rect = item.element.getBoundingClientRect();

      // Check viewport visibility
      if (
        rect.bottom < 0 ||
        rect.top > windowH ||
        rect.right < 0 ||
        rect.left > windowW ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        continue;
      }

      // Convert DOM rect to WebGL coordinates (WebGL Y is inverted from bottom-left)
      const x = Math.floor(rect.left * dpr);
      const y = Math.floor((windowH - rect.bottom) * dpr);
      const width = Math.floor(rect.width * dpr);
      const height = Math.floor(rect.height * dpr);

      gl.viewport(x, y, width, height);
      gl.scissor(x, y, width, height);

      // Smooth interaction factors
      const targetHover = item.isHovered ? 1.0 : 0.0;
      const targetActive = item.isActive ? 1.0 : 0.0;
      item.hoverLerp = lerp(item.hoverLerp, targetHover, 0.15);
      item.activeLerp = lerp(item.activeLerp, targetActive, 0.25);
      item.time += delta * item.speed;

      const fragmentSource =
        item.shader === 'custom' && item.customFragmentShader
          ? item.customFragmentShader
          : SHADER_PRESETS[item.shader as keyof typeof SHADER_PRESETS] || SHADER_PRESETS['liquid-glass'];

      const compileRes = this.engine.getOrCreateProgram(fragmentSource);

      if (compileRes.program) {
        this.engine.bindUniforms(compileRes.program, {
          u_time: item.time,
          u_resolution: [width, height],
          u_mouse: item.mousePos,
          u_hover: item.hoverLerp,
          u_active: item.activeLerp,
          u_corner_radius: item.cornerRadius * dpr,
          u_pixel_ratio: dpr,
          ...item.uniforms,
        });

        this.engine.render(compileRes.program);
      }
    }

    gl.disable(gl.SCISSOR_TEST);
  }

  public destroy() {
    this.stop();
    this.engine.destroy();
    this.elements.clear();
  }
}
