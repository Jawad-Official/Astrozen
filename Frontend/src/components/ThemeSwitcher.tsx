import { useTheme } from '@/context/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { 
  MagicWand, 
  Check, 
  Moon, 
  Sun, 
  PaintBrush,
  Desktop
} from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themeIcons: Record<ThemeName, React.ReactNode> = {
    light: <Sun weight="fill" className="h-4 w-4 text-amber-500" />,
    dark: <Moon weight="fill" className="h-4 w-4 text-blue-400" />,
    midnight: <PaintBrush weight="fill" className="h-4 w-4 text-indigo-400" />,
    forest: <PaintBrush weight="fill" className="h-4 w-4 text-emerald-400" />,
    ocean: <PaintBrush weight="fill" className="h-4 w-4 text-cyan-400" />,
    system: <Desktop weight="bold" className="h-4 w-4" />,
  };

  const themeLabels: Record<ThemeName, string> = {
    light: 'Light',
    dark: 'Dark',
    midnight: 'Midnight',
    forest: 'Forest',
    ocean: 'Ocean',
    system: 'System',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground relative"
        >
          <MagicWand className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          App Theme
        </DropdownMenuLabel>
        
        {Object.entries(themeLabels).map(([key, label]) => {
          const t = key as ThemeName;
          const isActive = theme === t;
          
          return (
            <DropdownMenuItem
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex items-center justify-between gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors",
                isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-2">
                {themeIcons[t]}
                <span className="text-sm">{label}</span>
              </div>
              {isActive && <Check weight="bold" className="h-3 w-3 text-primary" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-2" />
        
        <div className="px-1 py-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                Color Palette
            </div>
            <div className="grid grid-cols-5 gap-1">
                {Object.entries(themes).map(([key, value]) => (
                    <button
                        key={key}
                        onClick={() => setTheme(key as ThemeName)}
                        className={cn(
                            "h-6 w-6 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-110 active:scale-95",
                            theme === key && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                        style={{ backgroundColor: `hsl(${value.primary})` }}
                        title={key}
                    >
                        {theme === key && <Check weight="bold" className="h-3 w-3 text-white shadow-sm" />}
                    </button>
                ))}
            </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
