import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const HOLOGRAM_SCAN_SHADER = `
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  float dist = sdRoundedBox(pixelPos, halfSize, radius);
  if (dist > 0.0) {
    discard;
  }
  
  // Horizontal jitter glitch occasionally
  float glitchLine = step(0.98, sin(uv.y * 30.0 + u_time * 5.0));
  float glitchOffset = glitchLine * (hash21(vec2(u_time, uv.y)) - 0.5) * 0.04;
  vec2 scanUv = uv + vec2(glitchOffset, 0.0);
  
  // CRT scanlines
  float scanlines = sin(scanUv.y * u_resolution.y * 0.8) * 0.5 + 0.5;
  scanlines = pow(scanlines, 1.2);
  
  // Sweeping broad holographic bar
  float sweep = sin(scanUv.y * 4.0 - u_time * 2.5) * 0.5 + 0.5;
  sweep = pow(sweep, 4.0);
  
  // Subtle chromatic separation
  float noiseTex = hash21(scanUv * 100.0 + fract(u_time * 15.0));
  
  vec3 base = u_color_bg.rgb;
  vec3 holo = mix(u_color_primary.rgb, u_color_accent.rgb, scanUv.y);
  
  // Combine effects
  vec3 col = mix(base, holo, 0.25 + sweep * 0.35 + u_hover * 0.2);
  col *= (0.7 + scanlines * 0.3);
  col += vec3(noiseTex * 0.06);
  
  // Rim border
  float rim = smoothstep(-4.0, 0.0, dist) * 0.4;
  col += u_color_primary.rgb * rim;
  
  // Click pulse
  col += u_color_accent.rgb * u_active * 0.3;
  
  gl_FragColor = vec4(col, mix(u_color_bg.a, 0.95, 0.5 + u_hover * 0.3));
}
`;
