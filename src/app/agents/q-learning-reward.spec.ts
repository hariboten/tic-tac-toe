import { QLearningReward } from './q-learning-reward';

describe('QLearningReward', () => {
  it('should return expected rewards for win/lose/draw', () => {
    const reward = new QLearningReward();

    expect(reward.getReward('X', 'X')).toBe(1);
    expect(reward.getReward('X', 'O')).toBe(-1);
    expect(reward.getReward('DRAW', 'X')).toBe(0.2);
  });
});
