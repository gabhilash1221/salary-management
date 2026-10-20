import { roundHalfUp } from './money';

describe('roundHalfUp', () => {
  it('rounds half values away from zero', () => {
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(1.4)).toBe(1);
    expect(roundHalfUp(-1.5)).toBe(-2);
  });
});
