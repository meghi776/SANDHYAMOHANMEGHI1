import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const MobileSignUp = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!/^\d{10}$/.test(mobile)) {
      showError('Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      showError('Password should be at least 6 characters.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      phone: `+91${mobile}`,
      password: password,
    });

    if (error) {
      showError(error.message);
    } else if (data.user) {
      showSuccess('Account created successfully! Please sign in.');
      navigate('/login');
    } else {
        showError('An unknown error occurred during sign up. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Sign Up with Mobile
          </CardTitle>
          <CardDescription>
            Enter your mobile number and a password to create an account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link to="/login" className="underline">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default MobileSignUp;