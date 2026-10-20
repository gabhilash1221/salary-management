export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Cannot round a non-finite number');
  }
  return Math.sign(value) * Math.round(Math.abs(value));
}
