import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const RIPPLE_ECHO_SHADER = `
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
  
  // Normalized mouse coordinates
  vec2 m = u_mouse;
  float d = length((uv - m) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0));
  
  // Concentric ripples expanding
  float ripple1 = sin(d * 30.0 - u_time * 6.0);
  float ripple2 = sin(d * 45.0 - u_time * 9.0);
  
  // Attenuate ripples with distance
  float attenuation = exp(-d * 3.5);
  float rippleVal = (ripple1 * 0.6 + ripple2 * 0.4) * attenuation * (0.3 + u_hover * 0.7);
  
  // Active click shockwave
  float shockwave = sin(d * 20.0 - u_active * 15.0) * exp(-d * 2.0) * u_active;
  rippleVal += shockwave;
  
  vec3 base = u_color_bg.rgb;
  vec3 rippleCol = mix(u_color_primary.rgb, u_color_accent.rgb, sin(d * 10.0 + u_time) * 0.5 + 0.5);
  
  vec3 finalRgb = base + rippleCol * max(rippleVal, 0.0);
  
  // Add subtle border glow
  float rim = smoothstep(-3.0, 0.0, dist) * 0.35;
  finalRgb += u_color_primary.rgb * rim;
  
  gl_FragColor = vec4(finalRgb, mix(u_color_bg.a, 0.95, 0.4 + u_hover * 0.3));
}
`;
