import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
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
  ArrowClockwise
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Organization state
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loadingCode, setLoadingCode] = useState(false);
  
  const handleGenerateCode = async () => {
    setLoadingCode(true);
    try {
      const code = await organizationService.generateInviteCode();
      setInviteCode(code.code);
      toast({
        title: "Invite code generated",
        description: "Share this code with others to let them join.",
      });
    } catch (error) {
      toast({
        title: "Failed to generate code",
        description: "You might not have permission or there was an error.",
        variant: "destructive",
      });
    } finally {
      setLoadingCode(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Invite code copied to clipboard.",
    });
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      
      <Tabs defaultValue="workspace" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workspace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current User
              </CardTitle>
              <CardDescription>
                Your identity for issue assignments and activity tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/20 text-primary font-medium flex items-center justify-center rounded-lg">
                  {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : '??'}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.fullName || 'Not Logged In'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Buildings className="h-5 w-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Manage your organization and invite new members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Join Organization Code</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-md font-mono text-center border tracking-widest text-lg min-h-[50px] flex items-center justify-center">
                    {inviteCode || 'No code generated yet'}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => copyToClipboard(inviteCode)}
                    disabled={!inviteCode}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                  {user?.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={handleGenerateCode}
                      disabled={loadingCode}
                    >
                      <ArrowClockwise className={cn("h-5 w-5", loadingCode && "animate-spin")} />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this code with others to let them join your organization. 
                  {user?.role === 'admin' ? " Click the refresh icon to generate a new code." : " Only admins can generate new codes."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;