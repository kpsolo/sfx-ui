import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const PLASMA_FLOW_SHADER = `
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
  
  // Fluid coordinates
  vec2 p = uv * 3.0;
  float t = u_time * 0.7;
  
  // Interactive mouse displacement
  vec2 m = u_mouse * 3.0;
  p += (m - p) * (0.2 * u_hover);
  
  float v1 = sin(p.x + t);
  float v2 = sin(p.y + t);
  float v3 = sin(p.x + p.y + t);
  float v4 = sin(length(p - vec2(1.5)) * 1.5 - t * 1.5);
  
  float plasma = (v1 + v2 + v3 + v4) * 0.25;
  
  // Color mapping
  vec3 col1 = u_color_primary.rgb;
  vec3 col2 = u_color_secondary.rgb;
  vec3 col3 = u_color_accent.rgb;
  
  vec3 color = mix(col1, col2, sin(plasma * 3.1415) * 0.5 + 0.5);
  color = mix(color, col3, cos(plasma * 3.1415 + t * 0.5) * 0.5 + 0.5);
  
  // Blend with component background
  vec3 finalRgb = mix(u_color_bg.rgb, color, 0.45 + u_hover * 0.35);
  
  // Border highlight
  float rim = smoothstep(-5.0, 0.0, dist) * 0.4;
  finalRgb += col3 * rim;
  
  gl_FragColor = vec4(finalRgb, mix(u_color_bg.a, 0.95, 0.6 + u_hover * 0.3));
}
`;
