/** WebGL 支持探测：失败时小镇地图回退到现有 2D SVG 视图。 */
let cached: boolean | null = null;

export function webglSupported(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}
