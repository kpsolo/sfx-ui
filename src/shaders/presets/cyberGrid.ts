import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const CYBER_GRID_SHADER = `
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
  
  // Perspective projection
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  
  // Hover mouse interaction
  p.x += (u_mouse.x - 0.5) * 0.3 * u_hover;
  
  // 3D perspective horizon
  float horizon = -0.2;
  float depth = 1.0 / max(p.y - horizon, 0.01);
  
  vec3 col = u_color_bg.rgb;
  
  if (p.y > horizon) {
    vec2 gridUv = vec2(p.x * depth, depth + u_time * 1.5);
    vec2 gridLines = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
    float line = min(gridLines.x, gridLines.y);
    float grid = 1.0 - min(line, 1.0);
    
    // Fade into distance
    float fade = exp(-0.15 * depth);
    vec3 gridCol = mix(u_color_primary.rgb, u_color_accent.rgb, sin(depth * 0.5 + u_time) * 0.5 + 0.5);
    
    col += gridCol * grid * fade * (0.8 + u_hover * 0.4);
    
    // Horizon glow
    float glow = 0.04 / abs(p.y - horizon);
    col += u_color_accent.rgb * glow * 0.6;
  } else {
    // Sky / upper subtle starfield
    float stars = pow(hash21(floor(p * 40.0)), 25.0);
    col += u_color_primary.rgb * stars * (0.6 + sin(u_time * 2.0) * 0.4);
  }
  
  // Active pulse wave
  float pulse = sin(length(uv - u_mouse) * 20.0 - u_time * 8.0) * 0.5 + 0.5;
  col += u_color_accent.rgb * pulse * u_active * 0.3;
  
  gl_FragColor = vec4(col, u_color_bg.a);
}
`;
