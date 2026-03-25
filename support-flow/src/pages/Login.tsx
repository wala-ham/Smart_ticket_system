import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, Mail, Lock, Headphones, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    console.log('🔐 Login button clicked!');
    console.log('Email:', email, 'Password:', password);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      console.log('❌ Empty fields');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      console.log('⏳ Calling login function...');
      const ok = await login(email, password);
      console.log('✅ Login result:', ok);
      
      if (ok) {
        console.log('🎉 Login successful! Redirecting to /tickets');
        navigate('/tickets', { replace: true });
      } else {
        console.log('❌ Login failed - invalid credentials');
        setError('Invalid email or password');
      }
    } catch (err) {
      console.error('💥 Error during login:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('📝 Form submitted');
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-accent p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Ticket className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">SupportHub</h1>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Smart Customer Support<br />
            Ticket Management
          </h2>
          <p className="text-lg text-white/80 max-w-md">
            AI-powered ticket classification and prioritization for efficient support operations.
          </p>
          <div className="flex items-center gap-6 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">98%</p>
              <p className="text-sm text-white/70">AI Accuracy</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">2.5h</p>
              <p className="text-sm text-white/70">Avg Resolution</p>
            </div>
            <div className="w-px h-12 bg-white/30" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">15k+</p>
              <p className="text-sm text-white/70">Tickets/Month</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm">
             Smart Support System • 2026
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-card border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="gradient-primary p-3 rounded-xl">
                <Headphones className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="button"
                onClick={handleLogin}
                className="w-full gradient-primary" 
                disabled={isLoading || !email || !password}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              {/* <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </div> */}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
