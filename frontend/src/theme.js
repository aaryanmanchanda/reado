// Shared theme constants and helpers

export const NAVBAR_HEIGHT = 64;

export const COLORWAYS = {
  // Light themes
  natureFresh: {
    name: 'Nature/Fresh',
    '--bg-main': '#FBFFE4',
    '--accent': '#3D8D7A',
    '--bg-panel': '#A3D1C6',
    '--bg-input': '#FBFFE4',
    '--text-main': '#3D8D7A',
    '--text-dark': '#FBFFE4',
    '--comment-bg': '#A3D1C6',
    '--comment-scrollbar': '#3D8D7A',
    '--comment-scrollbar-bg': '#A3D1C6',
    isDark: false,
  },
  pinkBlossom: {
    name: 'Pink/Blossom',
    '--bg-main': '#FFF0F5',
    '--accent': '#D9468F',
    '--bg-panel': '#F5C2D9',
    '--bg-input': '#FFF0F5',
    '--text-main': '#D9468F',
    '--text-dark': '#FFF0F5',
    '--comment-bg': '#F5C2D9',
    '--comment-scrollbar': '#D9468F',
    '--comment-scrollbar-bg': '#F5C2D9',
    isDark: false,
  },
  blueLight: {
    name: 'Blue/Light',
    '--bg-main': '#e3f0ff',
    '--accent': '#2196f3',
    '--bg-panel': '#f5faff',
    '--bg-input': '#fff',
    '--text-main': '#2196f3',
    '--text-dark': '#222',
    '--comment-bg': '#e3f0ff',
    '--comment-scrollbar': '#2196f3',
    '--comment-scrollbar-bg': '#b3d1f7',
    isDark: false,
  },
  blueSerene: {
    name: 'Blue/Serene',
    '--bg-main': '#F9F7F7',
    '--accent': '#3F72AF',
    '--bg-panel': '#DBE2EF',
    '--bg-input': '#F9F7F7',
    '--text-main': '#112D4E',
    '--text-dark': '#F9F7F7',
    '--comment-bg': '#DBE2EF',
    '--comment-scrollbar': '#3F72AF',
    '--comment-scrollbar-bg': '#DBE2EF',
    isDark: false,
  },
  // Dark themes
  yellowDark: {
    name: 'Yellow/Dark',
    '--bg-main': '#222',
    '--accent': '#FFD600',
    '--bg-panel': '#333',
    '--bg-input': '#222',
    '--text-main': '#FFD600',
    '--text-dark': '#222',
    '--comment-bg': '#333',
    '--comment-scrollbar': '#FFD600',
    '--comment-scrollbar-bg': '#333',
    isDark: true,
  },
  redBlack: {
    name: 'Red/Black',
    '--bg-main': '#181818',
    '--accent': '#ff1744',
    '--bg-panel': '#222',
    '--bg-input': '#181818',
    '--text-main': '#ff1744',
    '--text-dark': '#fff',
    '--comment-bg': '#222',
    '--comment-scrollbar': '#ff1744',
    '--comment-scrollbar-bg': '#181818',
    isDark: true,
  },
};

// Helper function to get themes grouped by light/dark
export function getThemesGrouped() {
  const lightThemes = [];
  const darkThemes = [];
  
  Object.entries(COLORWAYS).forEach(([key, theme]) => {
    if (theme.isDark) {
      darkThemes.push([key, theme]);
    } else {
      lightThemes.push([key, theme]);
    }
  });
  
  return { lightThemes, darkThemes };
}

export function shadeColor(hex, percent) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
  g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
  b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function applyThemeVariables(themeKey) {
  const themeVars = COLORWAYS[themeKey];
  if (!themeVars) return;
  for (const key in themeVars) {
    if (key.startsWith('--')) {
      document.documentElement.style.setProperty(key, themeVars[key]);
    }
  }
}


