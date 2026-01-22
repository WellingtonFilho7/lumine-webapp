const KEY = 'lumine_onboarding_done';

export const getOnboardingFlag = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  return localStorage.getItem(KEY) === 'true';
};

export const setOnboardingFlag = value => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(KEY, value ? 'true' : 'false');
};

export const clearOnboardingFlag = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem(KEY);
};
