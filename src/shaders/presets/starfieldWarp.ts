import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const STARFIELD_WARP_SHADER = `
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
  
  vec2 centered = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  
  vec3 col = u_color_bg.rgb;
  float speed = 0.5 + u_hover * 1.5;
  
  // Multi-layer particle stars
  for (float i = 1.0; i <= 3.0; i += 1.0) {
    float layerDepth = fract(u_time * 0.2 * speed + i * 0.33);
    float size = mix(0.1, 1.5, layerDepth);
    vec2 p = centered * (1.0 / max(layerDepth, 0.001));
    
    vec2 cell = floor(p * 8.0);
    float star = hash21(cell + i * 43.12);
    
    if (star > 0.88) {
      vec2 local = fract(p * 8.0) - 0.5;
      float starGlow = smoothstep(0.18, 0.0, length(local));
      vec3 starColor = mix(u_color_primary.rgb, u_color_accent.rgb, star);
      col += starColor * starGlow * layerDepth * 1.2;
    }
  }
  
  // Interactive mouse illumination
  float mDist = length(uv - u_mouse);
  float mouseGlow = smoothstep(0.4, 0.0, mDist) * 0.25 * u_hover;
  col += u_color_accent.rgb * mouseGlow;
  
  // Edge border glow
  float rim = smoothstep(-4.0, 0.0, dist) * 0.3;
  col += u_color_primary.rgb * rim;
  
  gl_FragColor = vec4(col, u_color_bg.a);
}
`;
