// ...existing code...
import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from '../constants/theme';
import { ThemeMode } from '../types';

type Colors = ReturnType<typeof getColors>;

function getColors(isDark: boolean) {
    return isDark ? darkColors : lightColors;
}

interface ThemeContextType {
    themeMode: ThemeMode;
    colors: Colors;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
}

// create context as possibly undefined so we can detect missing provider
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme() ?? 'light';
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');

    const isDark =
        themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

    const colors = getColors(isDark);

    return (
        <ThemeContext.Provider value={{ themeMode, colors, isDark, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeColors(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useThemeColors must be used within ThemeProvider');
    return ctx;
}
// ...existing code...