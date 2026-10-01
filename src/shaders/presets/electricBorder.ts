import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const ELECTRIC_BORDER_SHADER = `
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  float dist = sdRoundedBox(pixelPos, halfSize, radius);
  
  // Cut strictly outside of bounds
  if (dist > 1.0) {
    discard;
  }
  
  // Border thickness band in pixels
  float borderWidth = 3.0 + u_hover * 1.5;
  float innerBand = abs(dist + borderWidth * 0.5);
  
  // Plasma electric noise around border
  float angle = atan(pixelPos.y, pixelPos.x);
  float perimeterNoise = fbm(vec2(angle * 4.0, u_time * 3.0));
  float arc = sin(angle * 6.0 + u_time * 6.0 + perimeterNoise * 3.0);
  
  // Sparkle / high frequency voltage jitter
  float sparks = hash21(uv * 50.0 + fract(u_time * 10.0));
  
  float borderIntensity = smoothstep(borderWidth, 0.0, innerBand);
  borderIntensity += smoothstep(borderWidth * 0.5, 0.0, innerBand) * arc * 0.6;
  
  vec3 borderCol = mix(u_color_primary.rgb, u_color_accent.rgb, arc * 0.5 + 0.5);
  borderCol += vec3(sparks * 0.4);
  
  // Inside fill: very subtle dark glow near perimeter, transparent further in
  float innerGlow = smoothstep(-20.0, 0.0, dist) * 0.25 * (u_hover + 0.2);
  vec3 fillCol = mix(u_color_bg.rgb, u_color_primary.rgb * 0.2, innerGlow);
  
  vec3 finalRgb = mix(fillCol, borderCol, borderIntensity);
  float finalAlpha = max(borderIntensity * 0.95, innerGlow * 0.4);
  
  // If active, blast full glow
  finalRgb += u_color_accent.rgb * u_active * 0.5;
  finalAlpha = mix(finalAlpha, 1.0, u_active * 0.3);
  
  gl_FragColor = vec4(finalRgb, finalAlpha);
}
`;
