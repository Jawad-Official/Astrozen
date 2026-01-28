import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { organizationService } from '@/services/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Buildings, Users, ArrowRight, CircleNotch, Globe } from '@phosphor-icons/react';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
});

const joinOrgSchema = z.object({
  inviteCode: z.string().min(8, 'Invite code must be 8 characters'),
});

export default function OrganizationSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createForm = useForm<z.infer<typeof createOrgSchema>>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '' },
  });

  const joinForm = useForm<z.infer<typeof joinOrgSchema>>({
    resolver: zodResolver(joinOrgSchema),
    defaultValues: { inviteCode: '' },
  });

  async function onCreateSubmit(values: z.infer<typeof createOrgSchema>) {
    setIsLoading(true);
    try {
      await organizationService.create(values as any);
      toast({
        title: "Organization created",
        description: "Your organization and default team are ready.",
      });
      // Force a hard refresh to ensure all context is updated
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to create organization",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  async function onJoinSubmit(values: z.infer<typeof joinOrgSchema>) {
    setIsLoading(true);
    try {
      await organizationService.join(values.inviteCode);
      toast({
        title: "Joined organization",
        description: "You have successfully joined the organization.",
      });
      // Force a hard refresh to ensure all context is updated
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to join organization",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Setup Organization"
      description="Create a new organization or join an existing one to get started."
      illustration={
        <div className="space-y-8 max-w-md relative">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl opacity-50" />
          
          <div className="relative bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Globe className="h-6 w-6 text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Your workspace</h3>
              <p className="text-muted-foreground leading-relaxed">
                Organizations act as a container for all your teams, projects, and work.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-20 rounded-lg bg-white/5 border border-white/5" />
              <div className="h-20 rounded-lg bg-white/5 border border-white/5" />
            </div>
          </div>
        </div>
      }
    >
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
          <TabsTrigger value="create" className="data-[state=active]:bg-background">
            <Buildings className="w-4 h-4 mr-2" />
            Create New
          </TabsTrigger>
          <TabsTrigger value="join" className="data-[state=active]:bg-background">
            <Users className="w-4 h-4 mr-2" />
            Join Existing
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="bg-primary/5 p-4 rounded-lg text-sm text-primary/80 border border-primary/10">
                <p>This will automatically create a default team for you and set you as the Administrator.</p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Create Organization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="join">
          <Form {...joinForm}>
            <form onSubmit={joinForm.handleSubmit(onJoinSubmit)} className="space-y-4">
              <FormField
                control={joinForm.control}
                name="inviteCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invite Code</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC12345" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground border border-border/50">
                <p>Ask your administrator for an invite code to join their organization.</p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join Organization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </AuthLayout>
  );
}
