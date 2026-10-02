import { ShaderEngine } from '../core/ShaderEngine';

export interface CanvasWidget {
  id: string;
  type: 'button' | 'slider' | 'switch' | 'card' | 'badge';
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  label: string;
  shader: 'liquid-glass' | 'cyber-grid' | 'aurora-waves' | 'electric-border' | 'plasma-flow';
  // State
  isHovered: boolean;
  isActive: boolean;
  value?: number; // for slider: 0..1, for switch: 0 or 1
  min?: number;
  max?: number;
}

// Master Canvas UI Shader that renders any SDF widget with custom shader fills
const PURE_CANVAS_FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec4 u_color_primary;
uniform vec4 u_color_accent;
uniform vec4 u_color_bg;

// Widget uniform data: rect [x, y, w, h] normalized in screen space
uniform vec4 u_widget_rect;
uniform float u_widget_radius;
uniform float u_widget_hover;
uniform float u_widget_active;
uniform float u_widget_type; // 0=card, 1=button, 2=slider, 3=switch, 4=badge
uniform float u_widget_value;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec2 screenPixel = v_uv * u_resolution;
  
  // Widget bounding box center & half dimensions in pixels
  vec2 widgetCenter = u_widget_rect.xy + u_widget_rect.zw * 0.5;
  vec2 halfSize = u_widget_rect.zw * 0.5;
  
  vec2 p = screenPixel - widgetCenter;
  float dist = sdRoundedBox(p, halfSize, u_widget_radius);
  
  if (dist > 1.0) {
    discard;
  }
  
  // Normalized local UV coordinates inside the widget [0..1]
  vec2 localUv = (p + halfSize) / u_widget_rect.zw;
  
  vec3 col = u_color_bg.rgb;
  
  // Type 0: Glass Card
  if (u_widget_type < 0.5) {
    float wave = sin(localUv.x * 6.0 + u_time * 1.5) * cos(localUv.y * 6.0 - u_time);
    col = mix(col, u_color_primary.rgb * 0.25, wave * 0.5 + 0.5);
    float rim = smoothstep(0.0, -2.5, dist);
    col += u_color_primary.rgb * (1.0 - rim) * 0.6;
  }
  // Type 1: Interactive Button
  else if (u_widget_type < 1.5) {
    float edge = smoothstep(0.0, -3.0, dist);
    vec3 btnCol = mix(u_color_primary.rgb, u_color_accent.rgb, localUv.x + sin(u_time * 2.0) * 0.2);
    col = mix(btnCol, col, edge * (0.4 - u_widget_hover * 0.2));
    col += u_color_accent.rgb * u_widget_active * 0.4;
  }
  // Type 2: Slider Track
  else if (u_widget_type < 2.5) {
    float fillW = u_widget_value;
    if (localUv.x < fillW) {
      float energy = sin(localUv.x * 20.0 - u_time * 6.0) * 0.5 + 0.5;
      col = mix(u_color_primary.rgb, u_color_accent.rgb, energy);
    } else {
      col = vec3(0.08, 0.12, 0.2);
    }
  }
  // Type 3: Toggle Switch
  else if (u_widget_type < 3.5) {
    if (u_widget_value > 0.5) {
      col = mix(u_color_primary.rgb * 0.8, u_color_accent.rgb, localUv.x);
    } else {
      col = vec3(0.1, 0.14, 0.22);
    }
  }
  // Type 4: Badge Pill
  else {
    float aura = sin(length(localUv - 0.5) * 15.0 - u_time * 4.0) * 0.5 + 0.5;
    col = mix(u_color_accent.rgb * 0.3, u_color_primary.rgb, aura);
  }
  
  // Antialiased border
  float alpha = smoothstep(1.0, 0.0, dist);
  gl_FragColor = vec4(col, alpha * 0.95);
}
`;

export class PureCanvasEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private engine: ShaderEngine;
  private widgets: CanvasWidget[] = [];
  private isRunning = false;
  private animId: number | null = null;
  private mousePos = { x: 0, y: 0 };
  private activeDraggingSlider: CanvasWidget | null = null;
  private onStateChange?: () => void;

  constructor(canvas: HTMLCanvasElement, onStateChange?: () => void) {
    this.canvas = canvas;
    this.onStateChange = onStateChange;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    }) || canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });

    if (!gl) throw new Error('WebGPU/WebGL unsupported');
    this.gl = gl;
    this.engine = new ShaderEngine(gl);

    this.setupListeners();
    this.start();
  }

  public setWidgets(widgets: CanvasWidget[]) {
    this.widgets = widgets;
  }

  public getWidgets() {
    return this.widgets;
  }

  private setupListeners() {
    const cvs = this.canvas;

    cvs.addEventListener('pointermove', (e) => {
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.mousePos = { x, y };

      if (this.activeDraggingSlider) {
        const relX = (x - this.activeDraggingSlider.x) / this.activeDraggingSlider.w;
        this.activeDraggingSlider.value = Math.max(0, Math.min(1, relX));
        this.onStateChange?.();
        return;
      }

      let hoveredAny = false;
      for (const w of this.widgets) {
        const inBounds = x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h;
        if (w.isHovered !== inBounds) {
          w.isHovered = inBounds;
          hoveredAny = true;
        }
      }
      if (hoveredAny) {
        cvs.style.cursor = this.widgets.some((w) => w.isHovered && w.type !== 'card')
          ? 'pointer'
          : 'default';
        this.onStateChange?.();
      }
    });

    cvs.addEventListener('pointerdown', (e) => {
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const w of this.widgets) {
        if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
          w.isActive = true;
          if (w.type === 'switch') {
            w.value = w.value ? 0 : 1;
            this.onStateChange?.();
          } else if (w.type === 'slider') {
            this.activeDraggingSlider = w;
            const relX = (x - w.x) / w.w;
            w.value = Math.max(0, Math.min(1, relX));
            this.onStateChange?.();
          } else if (w.type === 'button') {
            this.onStateChange?.();
          }
        }
      }
    });

    window.addEventListener('pointerup', () => {
      this.activeDraggingSlider = null;
      for (const w of this.widgets) {
        w.isActive = false;
      }
      this.onStateChange?.();
    });
  }

  public resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = (now: number) => {
      this.animId = requestAnimationFrame(loop);
      this.render(now / 1000);
    };
    this.animId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  private render(time: number) {
    const gl = this.gl;
    if (gl.isContextLost()) return;

    this.resize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cvsH = this.canvas.height;
    const cvsW = this.canvas.width;

    gl.viewport(0, 0, cvsW, cvsH);
    gl.clearColor(0.04, 0.05, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const compileRes = this.engine.getOrCreateProgram(PURE_CANVAS_FRAGMENT_SHADER);
    if (!compileRes.program) return;

    gl.useProgram(compileRes.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (const w of this.widgets) {
      // Scale widget rect to device pixels
      const wx = w.x * dpr;
      const wy = (this.canvas.clientHeight - (w.y + w.h)) * dpr; // Y-flipped for WebGL
      const ww = w.w * dpr;
      const wh = w.h * dpr;

      const typeId =
        w.type === 'card' ? 0 :
        w.type === 'button' ? 1 :
        w.type === 'slider' ? 2 :
        w.type === 'switch' ? 3 : 4;

      this.engine.bindUniforms(compileRes.program, {
        u_time: time,
        u_resolution: [cvsW, cvsH],
        u_mouse: [this.mousePos.x / (this.canvas.clientWidth || 1), this.mousePos.y / (this.canvas.clientHeight || 1)],
        u_color_primary: [0.22, 0.74, 0.97, 1.0],
        u_color_accent: [0.93, 0.28, 0.6, 1.0],
        u_color_bg: [0.08, 0.11, 0.18, 0.9],
        u_widget_rect: [wx, wy, ww, wh],
        u_widget_radius: w.radius * dpr,
        u_widget_hover: w.isHovered ? 1.0 : 0.0,
        u_widget_active: w.isActive ? 1.0 : 0.0,
        u_widget_type: typeId,
        u_widget_value: w.value !== undefined ? w.value : 0.0,
      });

      this.engine.render(compileRes.program);
    }
  }

  public destroy() {
    this.stop();
    this.engine.destroy();
  }
}
