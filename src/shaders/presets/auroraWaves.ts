import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const AURORA_WAVES_SHADER = `
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
  
  vec3 col = u_color_bg.rgb;
  
  // Layered wavy ribbon flows
  for (float i = 1.0; i <= 3.0; i += 1.0) {
    float freq = i * 2.5;
    float speed = u_time * 0.8 * (i * 0.5);
    
    // Mouse warp
    float mDist = length(uv - u_mouse);
    float warp = sin(uv.x * freq + speed + (u_mouse.x * 2.0) * u_hover) * 0.15;
    warp += cos(uv.y * (freq * 0.7) - speed) * 0.1;
    
    float waveDist = abs(uv.y - (0.5 + warp));
    float intensity = smoothstep(0.35, 0.0, waveDist);
    
    vec3 waveColor = mix(
      u_color_primary.rgb,
      u_color_accent.rgb,
      sin(i + u_time * 0.5) * 0.5 + 0.5
    );
    
    col += waveColor * intensity * (0.45 / i) * (0.8 + u_hover * 0.5);
  }
  
  // Vignette towards center
  float vig = 1.0 - length(uv - 0.5) * 0.5;
  col *= vig;
  
  // Active flash
  col += u_color_primary.rgb * u_active * 0.3;
  
  gl_FragColor = vec4(col, mix(u_color_bg.a, 0.98, u_hover * 0.2));
}
`;
