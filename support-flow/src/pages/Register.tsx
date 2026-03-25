import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Headphones, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    console.log('📝 Register button clicked!');
    console.log('Form data:', { fullName, email, phone, password });
    
    // Validate inputs
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      console.log('❌ Empty fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      console.log('❌ Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      console.log('❌ Password too short');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      console.log('⏳ Calling register function...');
      const success = await register(fullName, email, password, phone);
      console.log('✅ Register result:', success);
      
      if (success) {
        console.log('🎉 Registration successful! Redirecting to /tickets');
        toast.success('Account created successfully!');
        navigate('/tickets', { replace: true });
      } else {
        console.log('❌ Registration failed');
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('💥 Error during registration:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📋 Form submitted');
    handleRegister();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
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
          <p className="text-lg text-primary-foreground/70 max-w-md">
            Create your account and start managing your support tickets efficiently with our powerful platform.
          </p>
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">✓</span>
              </div>
              <span className="text-primary-foreground/80">Track all your support tickets in one place</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">✓</span>
              </div>
              <span className="text-primary-foreground/80">Get real-time updates on ticket status</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">✓</span>
              </div>
              <span className="text-primary-foreground/80">Communicate directly with support agents</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm">
            Smart Support System • 2026
          </p>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-card border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="gradient-primary p-3 rounded-xl">
                <Headphones className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Enter your details to get started
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
                <Label htmlFor="fullName">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+21620123456"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Button 
                type="button"
                onClick={handleRegister}
                className="w-full gradient-primary" 
                disabled={isLoading || !fullName || !email || !password || !confirmPassword}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}