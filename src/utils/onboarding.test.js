import { getOnboardingFlag, setOnboardingFlag, clearOnboardingFlag } from './onboarding';

describe('onboarding localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('getOnboardingFlag defaults to false', () => {
    expect(getOnboardingFlag()).toBe(false);
  });

  test('setOnboardingFlag persists true', () => {
    setOnboardingFlag(true);
    expect(getOnboardingFlag()).toBe(true);
  });

  test('clearOnboardingFlag resets to false', () => {
    setOnboardingFlag(true);
    clearOnboardingFlag();
    expect(getOnboardingFlag()).toBe(false);
  });
});
