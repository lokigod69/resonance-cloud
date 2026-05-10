import Phaser from 'phaser';

type Point = { x: number; y: number };
type Line = { a: Point; b: Point };

export type SliceResult = {
  topKey: string;
  bottomKey: string;
  angle: number;
  normal: Point;
};

export function createSliceTextures(
  scene: Phaser.Scene,
  textureKey: string,
  localLine: Line,
): SliceResult | undefined {
  const texture = scene.textures.get(textureKey);
  const frame = texture.get();
  const source = texture.getSourceImage() as CanvasImageSource;
  const width = Math.max(1, Math.round(frame.width));
  const height = Math.max(1, Math.round(frame.height));
  const rect = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const top = clipPolygon(rect, localLine, 1);
  const bottom = clipPolygon(rect, localLine, -1);
  if (top.length < 3 || bottom.length < 3) return undefined;

  const stamp = `${textureKey}-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
  const topKey = `${stamp}-top`;
  const bottomKey = `${stamp}-bottom`;
  renderHalf(scene, topKey, source, width, height, top);
  renderHalf(scene, bottomKey, source, width, height, bottom);

  const dx = localLine.b.x - localLine.a.x;
  const dy = localLine.b.y - localLine.a.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    topKey,
    bottomKey,
    angle: Math.atan2(dy, dx),
    normal: { x: -dy / length, y: dx / length },
  };
}

export function segmentIntersectsRect(a: Point, b: Point, rect: Phaser.Geom.Rectangle): boolean {
  if (rect.contains(a.x, a.y) || rect.contains(b.x, b.y)) return true;
  const lines = [
    new Phaser.Geom.Line(rect.left, rect.top, rect.right, rect.top),
    new Phaser.Geom.Line(rect.right, rect.top, rect.right, rect.bottom),
    new Phaser.Geom.Line(rect.right, rect.bottom, rect.left, rect.bottom),
    new Phaser.Geom.Line(rect.left, rect.bottom, rect.left, rect.top),
  ];
  const segment = new Phaser.Geom.Line(a.x, a.y, b.x, b.y);
  return lines.some((line) => Phaser.Geom.Intersects.LineToLine(segment, line));
}

function renderHalf(
  scene: Phaser.Scene,
  key: string,
  source: CanvasImageSource,
  width: number,
  height: number,
  polygon: Point[],
): void {
  const canvasTexture = scene.textures.createCanvas(key, width, height);
  if (!canvasTexture) return;
  const context = canvasTexture.getContext();
  context.clearRect(0, 0, width, height);
  context.save();
  context.beginPath();
  polygon.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.clip();
  context.drawImage(source, 0, 0, width, height);
  context.restore();
  canvasTexture.refresh();
}

function clipPolygon(polygon: Point[], line: Line, side: 1 | -1): Point[] {
  const output: Point[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const previous = polygon[(index + polygon.length - 1) % polygon.length];
    const currentInside = sideOf(line, current) * side >= 0;
    const previousInside = sideOf(line, previous) * side >= 0;

    if (currentInside && !previousInside) output.push(intersection(previous, current, line));
    if (currentInside) output.push(current);
    if (!currentInside && previousInside) output.push(intersection(previous, current, line));
  }
  return output;
}

function sideOf(line: Line, point: Point): number {
  return (line.b.x - line.a.x) * (point.y - line.a.y) - (line.b.y - line.a.y) * (point.x - line.a.x);
}

function intersection(start: Point, end: Point, line: Line): Point {
  const x1 = start.x;
  const y1 = start.y;
  const x2 = end.x;
  const y2 = end.y;
  const x3 = line.a.x;
  const y3 = line.a.y;
  const x4 = line.b.x;
  const y4 = line.b.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < 0.0001) return end;
  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator,
  };
}
