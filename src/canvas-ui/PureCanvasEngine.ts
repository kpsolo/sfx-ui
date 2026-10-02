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

export type WidgetActionType = 'click' | 'toggle' | 'drag';

// Master Canvas UI Shader that renders any SDF widget with custom shader fills & knobs
const PURE_CANVAS_FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec4 u_color_primary;
uniform vec4 u_color_accent;
uniform vec4 u_color_bg;

// Widget uniform data: rect [x, y, w, h] in screen pixels
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
  
  // Widget bounding box center & half dimensions in device pixels
  vec2 widgetCenter = u_widget_rect.xy + u_widget_rect.zw * 0.5;
  vec2 halfSize = u_widget_rect.zw * 0.5;
  
  vec2 p = screenPixel - widgetCenter;
  float dist = sdRoundedBox(p, halfSize, u_widget_radius);
  
  // Allow soft glow around widgets
  if (dist > 1.5) {
    discard;
  }
  
  // Normalized local UV coordinates inside the widget [0..1]
  vec2 localUv = (p + halfSize) / u_widget_rect.zw;
  
  vec3 col = u_color_bg.rgb;
  
  // ==========================================
  // TYPE 0: FROSTED GLASS CONTAINER CARD
  // ==========================================
  if (u_widget_type < 0.5) {
    float wave1 = sin(localUv.x * 5.0 + u_time * 1.2) * cos(localUv.y * 5.0 - u_time * 0.8);
    float wave2 = cos((localUv.x + localUv.y) * 4.0 + u_time * 0.9);
    vec3 glassGrad = mix(vec3(0.04, 0.06, 0.11), u_color_primary.rgb * 0.18, wave1 * 0.5 + 0.5);
    glassGrad = mix(glassGrad, u_color_accent.rgb * 0.14, wave2 * 0.5 + 0.5);
    
    // Cyber subtle grid pattern
    vec2 gridUv = fract(screenPixel / 28.0);
    float grid = step(0.96, gridUv.x) + step(0.96, gridUv.y);
    glassGrad += vec3(0.04, 0.06, 0.10) * grid;

    // Glowing border rim with high-tech corner bevel
    float rim = 1.0 - smoothstep(0.0, -3.0, dist);
    col = mix(glassGrad, u_color_primary.rgb * 0.8, rim * 0.8);
  }
  
  // ==========================================
  // TYPE 1: INTERACTIVE CYBER BUTTON
  // ==========================================
  else if (u_widget_type < 1.5) {
    // Flowing neon energy base
    vec3 btnCol = mix(u_color_primary.rgb * 0.35, u_color_accent.rgb * 0.35, localUv.x + sin(u_time * 2.5) * 0.2);
    
    // Hover glow acceleration
    if (u_widget_hover > 0.5) {
      btnCol = mix(btnCol, u_color_primary.rgb * 0.75, 0.6);
    }
    
    // Active press flash
    if (u_widget_active > 0.5) {
      btnCol += vec3(0.35, 0.35, 0.45);
    }
    
    // Border rim
    float rim = 1.0 - smoothstep(0.0, -3.0, dist);
    col = mix(btnCol, u_color_primary.rgb * 1.2, rim * 0.9);
    
    // Diagonal glass sheen beam
    float beam = smoothstep(0.06, 0.0, abs(localUv.x + localUv.y - fract(u_time * 0.4) * 2.5));
    col += u_color_accent.rgb * beam * 0.45;
  }
  
  // ==========================================
  // TYPE 2: INTERACTIVE SLIDER WITH SDF THUMB KNOB
  // ==========================================
  else if (u_widget_type < 2.5) {
    float fillRel = clamp(u_widget_value, 0.0, 1.0);
    float fillX = mix(-halfSize.x, halfSize.x, fillRel);
    
    // 1. Slider Track Background (Dark sleek groove)
    vec3 trackBg = vec3(0.06, 0.09, 0.15);
    
    // 2. Active Progress Fill (Glowing cyan-accent gradient)
    float wave = sin(localUv.x * 24.0 - u_time * 6.0) * 0.5 + 0.5;
    vec3 fillCol = mix(u_color_primary.rgb, u_color_accent.rgb, localUv.x + wave * 0.2);
    
    // Inner track bevel
    float innerBevel = smoothstep(halfSize.y - 1.0, 0.0, abs(p.y));
    trackBg += vec3(0.04) * innerBevel;
    fillCol += vec3(0.08) * innerBevel;
    
    col = (p.x < fillX) ? fillCol : trackBg;
    
    // 3. SDF Circular Thumb Knob
    vec2 thumbCenter = vec2(fillX, 0.0);
    float thumbRadius = halfSize.y + 2.0;
    float dThumb = length(p - thumbCenter) - thumbRadius;
    
    // Soft outer glow around thumb
    if (dThumb < 5.0 && dThumb > 0.0) {
      float glow = 1.0 - (dThumb / 5.0);
      col += u_color_primary.rgb * glow * (0.6 + u_widget_hover * 0.4);
    }
    
    // Thumb knob interior
    if (dThumb <= 0.0) {
      float specular = smoothstep(thumbRadius * 0.6, 0.0, length(p - thumbCenter - vec2(-2.0, 2.0)));
      vec3 knobCol = mix(vec3(0.96, 0.98, 1.0), u_color_primary.rgb, 0.25) + vec3(specular * 0.4);
      if (u_widget_active > 0.5) {
        knobCol = mix(knobCol, u_color_accent.rgb, 0.6);
      } else if (u_widget_hover > 0.5) {
        knobCol += u_color_primary.rgb * 0.3;
      }
      col = knobCol;
    }
  }
  
  // ==========================================
  // TYPE 3: INTERACTIVE TOGGLE SWITCH WITH SLIDING KNOB
  // ==========================================
  else if (u_widget_type < 3.5) {
    // 1. Pill Track Background
    vec3 onCol = mix(u_color_primary.rgb * 0.85, u_color_accent.rgb * 0.85, localUv.x);
    onCol += sin(localUv.x * 12.0 - u_time * 4.0) * 0.08;
    vec3 offCol = vec3(0.10, 0.13, 0.20);
    
    col = mix(offCol, onCol, clamp(u_widget_value, 0.0, 1.0));
    // Subtle track rim
    float rim = 1.0 - smoothstep(0.0, -2.5, dist);
    col = mix(col, (u_widget_value > 0.5 ? u_color_primary.rgb : vec3(0.25, 0.3, 0.4)), rim * 0.6);
    
    // 2. Sliding SDF Circular Knob
    float travel = halfSize.x - halfSize.y;
    float knobX = mix(-travel, travel, clamp(u_widget_value, 0.0, 1.0));
    vec2 knobCenter = vec2(knobX, 0.0);
    float knobRadius = halfSize.y - 3.0;
    float dKnob = length(p - knobCenter) - knobRadius;
    
    // Soft shadow under knob
    float dShadow = length(p - knobCenter + vec2(1.5, 1.5)) - knobRadius;
    if (dShadow < 3.0 && dKnob > 0.0) {
      col *= 0.6;
    }
    
    // Knob body
    if (dKnob <= 0.0) {
      float specular = smoothstep(knobRadius * 0.6, 0.0, length(p - knobCenter - vec2(-2.0, 2.0)));
      vec3 kCol = mix(vec3(0.96, 0.98, 1.0), vec3(0.85, 0.90, 0.95), length(p - knobCenter) / knobRadius);
      kCol += vec3(specular * 0.35);
      if (u_widget_value > 0.5) {
        kCol = mix(kCol, vec3(1.0), 0.4);
      }
      col = kCol;
    }
  }
  
  // ==========================================
  // TYPE 4: BADGE PILL
  // ==========================================
  else {
    float aura = sin(length(localUv - 0.5) * 14.0 - u_time * 4.0) * 0.5 + 0.5;
    vec3 badgeCol = mix(u_color_accent.rgb * 0.35, u_color_primary.rgb * 0.35, aura);
    float bRim = 1.0 - smoothstep(0.0, -2.5, dist);
    col = mix(badgeCol, u_color_accent.rgb, bRim * 0.9);
  }
  
  // Sub-pixel antialiased alpha outer edge
  float alpha = smoothstep(1.5, 0.0, dist);
  gl_FragColor = vec4(col, alpha * 0.96);
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
  public onWidgetAction?: (id: string, value: number | undefined, type: WidgetActionType) => void;

  // Bound event listeners for leak-free removal
  private boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundPointerDown: ((e: PointerEvent) => void) | null = null;
  private boundPointerUp: ((e: PointerEvent) => void) | null = null;

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

    this.boundPointerMove = (e: PointerEvent) => {
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.mousePos = { x, y };

      // Handle active slider dragging
      if (this.activeDraggingSlider) {
        const relX = (x - this.activeDraggingSlider.x) / this.activeDraggingSlider.w;
        this.activeDraggingSlider.value = Math.max(0, Math.min(1, relX));
        this.onWidgetAction?.(this.activeDraggingSlider.id, this.activeDraggingSlider.value, 'drag');
        this.onStateChange?.();
        return;
      }

      // Reverse hit-testing for hover states (child controls take precedence over cards)
      let hitInteractive = false;
      let cursorStyle = 'default';
      let stateChanged = false;

      for (let i = this.widgets.length - 1; i >= 0; i--) {
        const w = this.widgets[i];
        const inBounds = x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h;

        let shouldHover = false;
        if (inBounds) {
          if (w.type !== 'card') {
            if (!hitInteractive) {
              shouldHover = true;
              hitInteractive = true;
              cursorStyle = w.type === 'slider' ? 'ew-resize' : 'pointer';
            }
          } else {
            shouldHover = true; // subtle card hover
          }
        }

        if (w.isHovered !== shouldHover) {
          w.isHovered = shouldHover;
          stateChanged = true;
        }
      }

      cvs.style.cursor = cursorStyle;
      if (stateChanged) {
        this.onStateChange?.();
      }
    };

    this.boundPointerDown = (e: PointerEvent) => {
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Reverse hit-testing: test topmost widgets first so container cards don't intercept child clicks!
      for (let i = this.widgets.length - 1; i >= 0; i--) {
        const w = this.widgets[i];
        if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) {
          if (w.type === 'slider') {
            this.activeDraggingSlider = w;
            w.isActive = true;
            try {
              cvs.setPointerCapture(e.pointerId);
            } catch (_) {}
            const relX = (x - w.x) / w.w;
            w.value = Math.max(0, Math.min(1, relX));
            this.onWidgetAction?.(w.id, w.value, 'drag');
            this.onStateChange?.();
            break;
          } else if (w.type === 'switch') {
            w.isActive = true;
            w.value = w.value ? 0 : 1;
            this.onWidgetAction?.(w.id, w.value, 'toggle');
            this.onStateChange?.();
            break;
          } else if (w.type === 'button') {
            w.isActive = true;
            this.onWidgetAction?.(w.id, undefined, 'click');
            this.onStateChange?.();
            break;
          }
        }
      }
    };

    this.boundPointerUp = (e: PointerEvent) => {
      if (this.activeDraggingSlider) {
        this.activeDraggingSlider.isActive = false;
        try {
          cvs.releasePointerCapture(e.pointerId);
        } catch (_) {}
        this.activeDraggingSlider = null;
      }
      for (const w of this.widgets) {
        w.isActive = false;
      }
      this.onStateChange?.();
    };

    cvs.addEventListener('pointermove', this.boundPointerMove);
    cvs.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointerup', this.boundPointerUp);
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
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
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
    if (this.boundPointerMove) {
      this.canvas.removeEventListener('pointermove', this.boundPointerMove);
      this.boundPointerMove = null;
    }
    if (this.boundPointerDown) {
      this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
      this.boundPointerDown = null;
    }
    if (this.boundPointerUp) {
      window.removeEventListener('pointerup', this.boundPointerUp);
      this.boundPointerUp = null;
    }
    this.engine.destroy();
  }
}
