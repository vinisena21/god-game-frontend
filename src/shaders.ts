/**
 * Shaders WebGL otimizados para partículas.
 *
 * - precision mediump (mais rápido em GPU mobile)
 * - sem `discard` (evita early-Z kill caro)
 * - soft circle via smooth alpha
 * - size attenuation barata
 * - additive-friendly (alpha já no vColor.a implícito via rgb fade no CPU)
 */

/** Vertex: pontos com tamanho por atributo + atenuação de distância */
export const PARTICLE_VERT = /* glsl */ `
precision mediump float;

attribute float size;
varying vec3 vColor;

void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // atenuação estável; clamp evita pontos enormes perto da câmera
  float dist = max(0.1, -mvPosition.z);
  gl_PointSize = clamp(size * (140.0 / dist), 1.0, 64.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Fragment: soft disc sem discard.
 * Usa alpha = max(0, 1 - r²)^2 — barato e suave.
 */
export const PARTICLE_FRAG = /* glsl */ `
precision mediump float;

varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float r2 = dot(c, c);
  // fora do círculo: alpha 0 (sem discard)
  float alpha = max(0.0, 1.0 - r2 * 4.0);
  alpha *= alpha; // falloff mais suave
  if (alpha < 0.01) {
    gl_FragColor = vec4(0.0);
    return;
  }
  gl_FragColor = vec4(vColor, alpha);
}
`;

/** Chuva: pontos alongados baratos (sem textura) */
export const RAIN_VERT = /* glsl */ `
precision mediump float;

uniform float uSize;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = max(0.1, -mvPosition.z);
  gl_PointSize = clamp(uSize * (120.0 / dist), 1.0, 24.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const RAIN_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform float uOpacity;

void main() {
  // streak vertical barato
  vec2 uv = gl_PointCoord;
  float dx = abs(uv.x - 0.5) * 2.0;
  float alpha = (1.0 - dx) * uOpacity;
  alpha *= smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
  gl_FragColor = vec4(uColor, max(0.0, alpha));
}
`;
