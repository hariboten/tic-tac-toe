import { validateTrainingConfig } from './q-learning-config';

describe('validateTrainingConfig', () => {
  it('should clamp invalid ranges', () => {
    const validated = validateTrainingConfig({
      episodes: 3.8,
      learningRate: 2,
      discountFactor: -1,
      epsilon: 10,
      epsilonDecay: -4,
      minEpsilon: Number.NaN
    });

    expect(validated).toEqual({
      episodes: 3,
      learningRate: 1,
      discountFactor: 0,
      epsilon: 1,
      epsilonDecay: 0,
      minEpsilon: 0
    });
  });
});
