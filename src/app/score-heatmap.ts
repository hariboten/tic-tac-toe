export type HeatmapMode = 'SEQUENTIAL' | 'DIVERGING';

export type HeatmapPalette = {
  sequentialRgb: readonly [number, number, number];
  positiveRgb: readonly [number, number, number];
  negativeRgb: readonly [number, number, number];
};

export type HeatmapOptions = {
  alphaMin?: number;
  alphaMax?: number;
  palette?: HeatmapPalette;
};

export type HeatmapScale = {
  mode: HeatmapMode;
  min: number;
  max: number;
  absMax: number;
};

const DEFAULT_OPTIONS: Required<HeatmapOptions> = {
  alphaMin: 0.05,
  alphaMax: 0.45,
  palette: {
    sequentialRgb: [34, 197, 94],
    positiveRgb: [244, 114, 182],
    negativeRgb: [56, 189, 248]
  }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const isFiniteNumber = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

export const buildHeatmapScale = (scores: ReadonlyArray<number | null | undefined>): HeatmapScale | null => {
  const validScores = scores.filter(isFiniteNumber);
  if (validScores.length === 0) {
    return null;
  }

  const min = Math.min(...validScores);
  const max = Math.max(...validScores);
  const absMax = Math.max(Math.abs(min), Math.abs(max));
  const mode: HeatmapMode = min < 0 ? 'DIVERGING' : 'SEQUENTIAL';

  return { mode, min, max, absMax };
};

export const toHeatmapBackground = (
  value: number | null | undefined,
  scale: HeatmapScale | null,
  options?: HeatmapOptions
): string => {
  if (!isFiniteNumber(value) || !scale) {
    return 'transparent';
  }

  const mergedOptions: Required<HeatmapOptions> = {
    alphaMin: options?.alphaMin ?? DEFAULT_OPTIONS.alphaMin,
    alphaMax: options?.alphaMax ?? DEFAULT_OPTIONS.alphaMax,
    palette: options?.palette ?? DEFAULT_OPTIONS.palette
  };

  const alphaMin = clamp(mergedOptions.alphaMin, 0, 1);
  const alphaMax = clamp(Math.max(alphaMin, mergedOptions.alphaMax), alphaMin, 1);

  let normalized = 0;
  let rgb: readonly [number, number, number] = mergedOptions.palette.sequentialRgb;

  if (scale.mode === 'SEQUENTIAL') {
    const denominator = scale.max - scale.min;
    normalized = denominator === 0 ? 0 : (value - scale.min) / denominator;
    normalized = clamp(normalized, 0, 1);
  } else {
    normalized = scale.absMax === 0 ? 0 : value / scale.absMax;
    normalized = clamp(normalized, -1, 1);
    rgb = normalized >= 0 ? mergedOptions.palette.positiveRgb : mergedOptions.palette.negativeRgb;
  }

  const alpha = alphaMin + (alphaMax - alphaMin) * Math.abs(normalized);
  const [r, g, b] = rgb;

  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
};
