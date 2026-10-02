import { VERTEX_SHADER_SOURCE } from '../shaders/common';
import { ShaderUniforms } from './types';

export interface CompilationResult {
  program: WebGLProgram | null;
  error: string | null;
}

export class ShaderEngine {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private programCache = new Map<string, WebGLProgram>();
  private vertexShader: WebGLShader | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.initQuad();
  }

  private initQuad() {
    const gl = this.gl;
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  }

  public getOrCreateProgram(fragmentSource: string): CompilationResult {
    const gl = this.gl;

    if (gl.isContextLost()) {
      return { program: null, error: null };
    }

    if (this.programCache.has(fragmentSource)) {
      return { program: this.programCache.get(fragmentSource)!, error: null };
    }

    // Compile vertex shader once
    if (!this.vertexShader) {
      const vs = gl.createShader(gl.VERTEX_SHADER);
      if (!vs) return { program: null, error: null };
      gl.shaderSource(vs, VERTEX_SHADER_SOURCE);
      gl.compileShader(vs);
      const vsStatus = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
      if (vsStatus === false) {
        const info = gl.getShaderInfoLog(vs) || 'Vertex compilation failed';
        gl.deleteShader(vs);
        return { program: null, error: `Vertex Shader Error: ${info}` };
      }
      if (!vsStatus) {
        return { program: null, error: null };
      }
      this.vertexShader = vs;
    }

    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) return { program: null, error: null };

    gl.shaderSource(fs, fragmentSource);
    gl.compileShader(fs);

    const fsStatus = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
    if (fsStatus === false) {
      const info = gl.getShaderInfoLog(fs) || 'Unknown compilation error';
      gl.deleteShader(fs);
      return { program: null, error: info };
    }
    if (!fsStatus) {
      return { program: null, error: null };
    }

    // Link program
    const program = gl.createProgram();
    if (!program) return { program: null, error: null };

    gl.attachShader(program, this.vertexShader);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (linkStatus === false) {
      const info = gl.getProgramInfoLog(program) || 'Unknown linking error';
      gl.deleteProgram(program);
      gl.deleteShader(fs);
      return { program: null, error: info };
    }
    if (!linkStatus) {
      return { program: null, error: null };
    }

    gl.deleteShader(fs); // Marked for deletion once detached/unused
    this.programCache.set(fragmentSource, program);
    return { program, error: null };
  }

  public bindUniforms(program: WebGLProgram, uniforms: Partial<ShaderUniforms>) {
    const gl = this.gl;
    gl.useProgram(program);

    // Standard uniforms
    if (uniforms.u_time !== undefined) {
      const loc = gl.getUniformLocation(program, 'u_time');
      if (loc) gl.uniform1f(loc, uniforms.u_time);
    }

    if (uniforms.u_resolution) {
      const loc = gl.getUniformLocation(program, 'u_resolution');
      if (loc) gl.uniform2f(loc, uniforms.u_resolution[0], uniforms.u_resolution[1]);
    }

    if (uniforms.u_mouse) {
      const loc = gl.getUniformLocation(program, 'u_mouse');
      if (loc) gl.uniform2f(loc, uniforms.u_mouse[0], uniforms.u_mouse[1]);
    }

    if (uniforms.u_hover !== undefined) {
      const loc = gl.getUniformLocation(program, 'u_hover');
      if (loc) gl.uniform1f(loc, uniforms.u_hover);
    }

    if (uniforms.u_active !== undefined) {
      const loc = gl.getUniformLocation(program, 'u_active');
      if (loc) gl.uniform1f(loc, uniforms.u_active);
    }

    if (uniforms.u_corner_radius !== undefined) {
      const loc = gl.getUniformLocation(program, 'u_corner_radius');
      if (loc) gl.uniform1f(loc, uniforms.u_corner_radius);
    }

    if (uniforms.u_pixel_ratio !== undefined) {
      const loc = gl.getUniformLocation(program, 'u_pixel_ratio');
      if (loc) gl.uniform1f(loc, uniforms.u_pixel_ratio);
    }

    // Colors vec4
    const colorKeys: string[] = [
      'u_color_primary',
      'u_color_secondary',
      'u_color_accent',
      'u_color_bg',
      'u_border_color'
    ];

    for (const key of colorKeys) {
      const val = uniforms[key];
      if (Array.isArray(val) && val.length === 4) {
        const loc = gl.getUniformLocation(program, key);
        if (loc) gl.uniform4f(loc, val[0], val[1], val[2], val[3]);
      }
    }

    // Arbitrary custom uniforms
    for (const [k, v] of Object.entries(uniforms)) {
      if (k.startsWith('u_custom_') || !k.startsWith('u_')) {
        const loc = gl.getUniformLocation(program, k);
        if (!loc) continue;
        if (typeof v === 'number') {
          gl.uniform1f(loc, v);
        } else if (Array.isArray(v)) {
          if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
          else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
          else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
        }
      }
    }
  }

  public render(program: WebGLProgram) {
    const gl = this.gl;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const posAttr = gl.getAttribLocation(program, 'a_position');
    if (posAttr !== -1) {
      gl.enableVertexAttribArray(posAttr);
      gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    const gl = this.gl;
    this.programCache.forEach(program => gl.deleteProgram(program));
    this.programCache.clear();
    if (this.vertexShader) gl.deleteShader(this.vertexShader);
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
  }
}
