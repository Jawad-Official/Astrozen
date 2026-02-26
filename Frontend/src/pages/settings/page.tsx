import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { themes, ThemeName } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { organizationService } from '@/services/organization';
import { 
  Gear as SettingsIcon, 
  User,
  Buildings,
  Copy,
  ArrowClockwise,
  Palette,
  Check,
  Desktop,
  Sun,
  Moon
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // ... (invite code logic)

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      
      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workspace" className="space-y-6">
          {/* ... existing User card */}
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how Astrozen looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Interface Theme</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'system', name: 'System', icon: Desktop, description: 'Follow system settings' },
                    { id: 'light', name: 'Light', icon: Sun, description: 'Always light mode' },
                    { id: 'dark', name: 'Dark', icon: Moon, description: 'Always dark mode' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as ThemeName)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                        theme === t.id 
                          ? "border-primary bg-primary/5 shadow-md" 
                          : "border-border hover:border-muted-foreground/20 bg-muted/30"
                      )}
                    >
                      <t.icon className={cn("h-6 w-6", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                      <div className="text-center">
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground">{t.description}</div>
                      </div>
                      {theme === t.id && <Check weight="bold" className="h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <Label>Accent Presets</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(themes).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key as ThemeName)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        theme === key 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div 
                        className="h-4 w-4 rounded-full shadow-sm" 
                        style={{ backgroundColor: `hsl(${value.primary})` }}
                      />
                      <span className="text-sm capitalize font-medium">{key}</span>
                      {theme === key && <Check weight="bold" className="ml-auto h-3 w-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          {/* ... existing Organization card */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;