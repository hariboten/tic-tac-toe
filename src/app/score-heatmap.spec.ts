import { buildHeatmapScale, toHeatmapBackground } from './score-heatmap';

describe('score heatmap', () => {
  it('returns sequential scale when all scores are non-negative', () => {
    const scale = buildHeatmapScale([0.2, 0.8, 0.5]);

    expect(scale).toEqual({
      mode: 'SEQUENTIAL',
      min: 0.2,
      max: 0.8,
      absMax: 0.8
    });
  });

  it('returns diverging scale when any score is negative', () => {
    const scale = buildHeatmapScale([-0.4, 0.1, 0.3]);

    expect(scale).toEqual({
      mode: 'DIVERGING',
      min: -0.4,
      max: 0.3,
      absMax: 0.4
    });
  });

  it('ignores nullish and NaN values when building scale', () => {
    const scale = buildHeatmapScale([null, undefined, Number.NaN, 0.25]);

    expect(scale).toEqual({
      mode: 'SEQUENTIAL',
      min: 0.25,
      max: 0.25,
      absMax: 0.25
    });
  });

  it('returns transparent when scale or value is invalid', () => {
    expect(toHeatmapBackground(null, null)).toBe('transparent');
    expect(toHeatmapBackground(Number.NaN, buildHeatmapScale([0.2]))).toBe('transparent');
  });

  it('normalizes sequential values and handles max == min', () => {
    const sequentialScale = buildHeatmapScale([0.2, 0.8, 0.5]);
    expect(toHeatmapBackground(0.5, sequentialScale)).toBe('rgba(34, 197, 94, 0.250)');

    const flatScale = buildHeatmapScale([0.4, 0.4]);
    expect(toHeatmapBackground(0.4, flatScale)).toBe('rgba(34, 197, 94, 0.050)');
  });

  it('normalizes diverging values and handles absMax == 0', () => {
    const divergingScale = buildHeatmapScale([-0.5, 0.25]);
    expect(toHeatmapBackground(-0.25, divergingScale)).toBe('rgba(56, 189, 248, 0.250)');
    expect(toHeatmapBackground(0.5, divergingScale)).toBe('rgba(244, 114, 182, 0.450)');

    const zeroScale = buildHeatmapScale([0]);
    expect(toHeatmapBackground(0, zeroScale)).toBe('rgba(34, 197, 94, 0.050)');
  });
});
