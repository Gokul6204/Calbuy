import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'system';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        let effectiveTheme = theme;
        if (theme === 'system') {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = systemDark ? 'dark' : 'light';
        }

        root.setAttribute('data-theme', effectiveTheme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (theme === 'system') {
                const root = window.document.documentElement;
                root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        };
        
        // Listen to system value changes
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            // Deprecated fallback
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
