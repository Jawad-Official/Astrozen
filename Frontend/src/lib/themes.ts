/**
 * Centralized Theme Registry
 * 
 * To add a new theme:
 * 1. Add its name to the `ThemeName` type.
 * 2. Add its color definitions to the `themes` object.
 * 3. Add the theme class to `index.css`.
 */

export type ThemeName = 'dark' | 'light' | 'midnight' | 'forest' | 'ocean' | 'system';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-border': string;
}

export const themes: Record<Exclude<ThemeName, 'system'>, ThemeColors> = {
  dark: {
    background: '0 0% 3.5%',
    foreground: '220 9% 94%',
    primary: '142 76% 36%',
    'primary-foreground': '220 13% 10%',
    secondary: '220 13% 18%',
    'secondary-foreground': '220 9% 94%',
    muted: '220 13% 18%',
    'muted-foreground': '220 9% 65%',
    accent: '220 13% 22%',
    'accent-foreground': '220 9% 94%',
    destructive: '0 84% 60%',
    'destructive-foreground': '220 9% 94%',
    border: '220 13% 20%',
    input: '220 13% 20%',
    ring: '142 76% 36%',
    'sidebar-background': '0 0% 2%',
    'sidebar-foreground': '220 9% 94%',
    'sidebar-primary': '142 76% 36%',
    'sidebar-border': '220 13% 16%',
  },
  light: {
    background: '0 0% 98%',
    foreground: '222 47% 11%',
    primary: '142 76% 36%',
    'primary-foreground': '210 40% 98%',
    secondary: '210 40% 96.1%',
    'secondary-foreground': '222 47% 11%',
    muted: '210 40% 96.1%',
    'muted-foreground': '215.4 16.3% 46.9%',
    accent: '210 40% 96.1%',
    'accent-foreground': '222 47% 11%',
    destructive: '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    border: '214.3 31.8% 91.4%',
    input: '214.3 31.8% 91.4%',
    ring: '142 76% 36%',
    'sidebar-background': '0 0% 98%',
    'sidebar-foreground': '222 47% 11%',
    'sidebar-primary': '142 76% 36%',
    'sidebar-border': '214.3 31.8% 91.4%',
  },
  midnight: {
    background: '222 47% 4%',
    foreground: '210 40% 98%',
    primary: '217 91% 60%',
    'primary-foreground': '222 47% 4%',
    secondary: '217 32% 12%',
    'secondary-foreground': '210 40% 98%',
    muted: '217 32% 12%',
    'muted-foreground': '215 20% 65%',
    accent: '217 32% 18%',
    'accent-foreground': '210 40% 98%',
    destructive: '0 84% 60%',
    'destructive-foreground': '210 40% 98%',
    border: '217 32% 15%',
    input: '217 32% 15%',
    ring: '217 91% 60%',
    'sidebar-background': '222 47% 2%',
    'sidebar-foreground': '210 40% 98%',
    'sidebar-primary': '217 91% 60%',
    'sidebar-border': '217 32% 12%',
  },
  forest: {
    background: '142 30% 4%',
    foreground: '142 20% 95%',
    primary: '142 72% 29%',
    'primary-foreground': '142 30% 4%',
    secondary: '142 20% 12%',
    'secondary-foreground': '142 20% 95%',
    muted: '142 20% 12%',
    'muted-foreground': '142 10% 60%',
    accent: '142 20% 18%',
    'accent-foreground': '142 20% 95%',
    destructive: '0 84% 60%',
    'destructive-foreground': '142 20% 95%',
    border: '142 20% 15%',
    input: '142 20% 15%',
    ring: '142 72% 29%',
    'sidebar-background': '142 30% 2%',
    'sidebar-foreground': '142 20% 95%',
    'sidebar-primary': '142 72% 29%',
    'sidebar-border': '142 20% 12%',
  },
  ocean: {
    background: '200 40% 4%',
    foreground: '200 20% 95%',
    primary: '199 89% 48%',
    'primary-foreground': '200 40% 4%',
    secondary: '200 20% 12%',
    'secondary-foreground': '200 20% 95%',
    muted: '200 20% 12%',
    'muted-foreground': '200 10% 60%',
    accent: '200 20% 18%',
    'accent-foreground': '200 20% 95%',
    destructive: '0 84% 60%',
    'destructive-foreground': '200 20% 95%',
    border: '200 20% 15%',
    input: '200 20% 15%',
    ring: '199 89% 48%',
    'sidebar-background': '200 40% 2%',
    'sidebar-foreground': '200 20% 95%',
    'sidebar-primary': '199 89% 48%',
    'sidebar-border': '200 20% 12%',
  }
};
