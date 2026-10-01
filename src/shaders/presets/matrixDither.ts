import { COMMON_UNIFORMS_GLSL, GLSL_HELPERS } from '../common';

export const MATRIX_DITHER_SHADER = `
${COMMON_UNIFORMS_GLSL}
${GLSL_HELPERS}

// 4x4 Bayer Dither Matrix normalized
float bayer4x4(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int index = x + y * 4;
  
  // Normalized 4x4 matrix values
  float m[16];
  m[0] = 0.0/16.0;   m[1] = 8.0/16.0;   m[2] = 2.0/16.0;   m[3] = 10.0/16.0;
  m[4] = 12.0/16.0;  m[5] = 4.0/16.0;   m[6] = 14.0/16.0;  m[7] = 6.0/16.0;
  m[8] = 3.0/16.0;   m[9] = 11.0/16.0;  m[10] = 1.0/16.0;  m[11] = 9.0/16.0;
  m[12] = 15.0/16.0; m[13] = 7.0/16.0;  m[14] = 13.0/16.0; m[15] = 5.0/16.0;
  
  for (int i = 0; i < 16; i++) {
    if (i == index) return m[i];
  }
  return 0.5;
}

void main() {
  vec2 uv = v_uv;
  vec2 pixelPos = (uv - 0.5) * u_resolution;
  vec2 halfSize = (u_resolution * 0.5) - vec2(1.0);
  float radius = min(u_corner_radius, min(halfSize.x, halfSize.y));
  
  float dist = sdRoundedBox(pixelPos, halfSize, radius);
  if (dist > 0.0) {
    discard;
  }
  
  vec2 screenPixel = uv * u_resolution;
  float threshold = bayer4x4(screenPixel);
  
  // Moving wave luminance
  float wave = sin(uv.x * 6.0 + u_time * 2.0) * cos(uv.y * 6.0 - u_time * 1.5);
  float lum = (wave * 0.5 + 0.5);
  lum += u_hover * 0.3;
  
  float dithered = step(threshold, lum);
  
  vec3 col = mix(u_color_bg.rgb, u_color_primary.rgb, dithered * 0.85);
  
  // Highlight active
  col += u_color_accent.rgb * u_active * 0.4;
  
  gl_FragColor = vec4(col, u_color_bg.a);
}
`;
