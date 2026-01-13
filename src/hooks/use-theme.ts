import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

// Use the same key as SettingsContext
const SETTINGS_KEY = "teamhub_user_settings";

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

function getStoredTheme(): Theme {
  if (typeof window !== "undefined") {
    try {
      // Read from the unified settings storage
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const theme = parsed.appearance?.theme;
        if (theme === "light" || theme === "dark" || theme === "system") {
          return theme;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  return "system";
}

function saveThemeToSettings(theme: Theme): void {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      const settings = saved ? JSON.parse(saved) : {};
      if (!settings.appearance) {
        settings.appearance = {};
      }
      settings.appearance.theme = theme;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      // Ignore errors
    }
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const stored = getStoredTheme();
    return stored === "system" ? getSystemTheme() : stored;
  });

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    const resolved = theme === "system" ? getSystemTheme() : theme;

    // Only toggle 'dark' class, don't add 'light' class
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setResolvedTheme(resolved);

    // Store theme preference in unified settings
    saveThemeToSettings(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      const root = window.document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      setResolvedTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "light";
      // If system, toggle to opposite of current resolved theme
      return resolvedTheme === "light" ? "dark" : "light";
    });
  }, [resolvedTheme]);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "system";
      return "light";
    });
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    cycleTheme,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
    isSystem: theme === "system",
  };
}
