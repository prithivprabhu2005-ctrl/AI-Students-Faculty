export const THEME_KEY = 'theme_preference';

export const getStoredTheme = () => {
  return localStorage.getItem(THEME_KEY) || 'system';
};

export const applyTheme = (choice) => {
  const theme = choice || getStoredTheme();
  let resolvedTheme = theme;

  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', resolvedTheme);
  return resolvedTheme;
};

export const initThemeListener = (onThemeChange) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = () => {
    const currentPreference = getStoredTheme();
    if (currentPreference === 'system') {
      applyTheme('system');
      if (onThemeChange) onThemeChange();
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleChange);
  }

  return () => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleChange);
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(handleChange);
    }
  };
};
