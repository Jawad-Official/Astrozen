import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ArrowRight, CircleNotch, Sparkle } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';


const loginSchema = z.object({
  username: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, user: authUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && authUser) {
      if (!authUser.organizationId) {
        navigate('/org-setup');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, authUser, navigate]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await authService.login(values as any);
      await login(response.access_token);
      // Redirection is handled by the useEffect above once state updates
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout 
      title="Welcome back" 
      description="Enter your credentials to access your account."
      illustration={
        <div className="space-y-8 max-w-md relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl opacity-50" />
          
          <div className="relative bg-card/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkle className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Focus on what matters</h3>
              <p className="text-muted-foreground leading-relaxed">
                Experience a new standard for issue tracking. Built for high-performance teams who ship fast.
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="login-form">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email">Email</FormLabel>
                <FormControl>
                  <Input id="email" placeholder="name@company.com" {...field} className="bg-background/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormControl>
                  <Input id="password" type="password" {...field} className="bg-background/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Log in
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
      
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:underline font-medium transition-colors">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
}
