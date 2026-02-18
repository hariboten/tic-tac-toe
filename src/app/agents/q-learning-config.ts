export interface QLearningTrainingConfig {
  episodes: number;
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
}

export interface ValidatedTrainingConfig extends QLearningTrainingConfig {}

export function validateTrainingConfig(config: QLearningTrainingConfig): ValidatedTrainingConfig {
  return {
    episodes: Math.max(0, Math.floor(config.episodes)),
    learningRate: clamp(config.learningRate, 0, 1),
    discountFactor: clamp(config.discountFactor, 0, 1),
    epsilon: clamp(config.epsilon, 0, 1),
    epsilonDecay: clamp(config.epsilonDecay, 0, 1),
    minEpsilon: clamp(config.minEpsilon, 0, 1)
  };
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
