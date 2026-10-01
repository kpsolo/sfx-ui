import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const LIQUID_GLASS_SHADER = `
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  // SDF clip for rounded corners
  float dist = sdRoundedBox(pixelPos, halfSize, radius);
  if (dist > 0.0) {
    discard;
  }
  
  // Mouse interaction distance
  vec2 mouseUv = u_mouse;
  float mouseDist = length(uv - mouseUv);
  float mouseInfluence = smoothstep(0.6, 0.0, mouseDist) * u_hover;
  
  // Fluid distortion
  vec2 warp = vec2(
    fbm(uv * 3.0 + vec2(u_time * 0.1, 0.0)),
    fbm(uv * 3.0 + vec2(0.0, u_time * 0.12))
  );
  
  vec2 warpedUv = uv + (warp - 0.5) * (0.04 + mouseInfluence * 0.06);
  
  // Base glass tint
  vec4 baseBg = u_color_bg;
  vec4 primary = u_color_primary;
  vec4 accent = u_color_accent;
  
  // Chromatic refraction
  float r = fbm(warpedUv * 4.0 + vec2(0.01, 0.0) + u_time * 0.05);
  float g = fbm(warpedUv * 4.0 + u_time * 0.05);
  float b = fbm(warpedUv * 4.0 - vec2(0.01, 0.0) + u_time * 0.05);
  
  vec3 glassColor = mix(primary.rgb, accent.rgb, r * 0.5 + 0.5);
  glassColor += vec3(r - g, g - b, b - r) * 0.25;
  
  // Surface sheen / specular highlight based on mouse
  float sheen = pow(max(1.0 - mouseDist * 1.8, 0.0), 3.0) * (0.4 + u_active * 0.4);
  
  // Rim lighting along SDF edge
  float rim = smoothstep(-6.0, 0.0, dist) * 0.5;
  
  vec3 finalRgb = mix(baseBg.rgb, glassColor, 0.25 + u_hover * 0.2) + vec3(sheen + rim);
  float finalAlpha = mix(baseBg.a, 0.95, 0.5 + u_hover * 0.3);
  
  gl_FragColor = vec4(finalRgb, finalAlpha);
}
`;
