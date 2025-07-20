import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

type Stage = 'enter-phone' | 'enter-otp' | 'update-password';

const ForgotPassword = () => {
  const [stage, setStage] = useState<Stage>('enter-phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!/^\d{10}$/.test(mobile)) {
      showError('Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${mobile}`,
    });

    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('OTP sent to your mobile number.');
      setStage('enter-otp');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (otp.length !== 6) {
      showError('Please enter a valid 6-digit OTP.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+91${mobile}`,
      token: otp,
      type: 'sms',
    });

    setLoading(false);
    if (error) {
      showError(error.message);
    } else if (data.session) {
      showSuccess('OTP verified successfully. Please set a new password.');
      setStage('update-password');
    } else {
      showError('Invalid OTP. Please try again.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Password updated successfully! Please sign in with your new password.');
      await supabase.auth.signOut(); // Sign out the user after password update
      navigate('/login');
    }
  };

  const renderStage = () => {
    switch (stage) {
      case 'enter-phone':
        return (
          <form onSubmit={handleSendOtp}>
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </CardFooter>
          </form>
        );
      case 'enter-otp':
        return (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify OTP
              </Button>
            </CardFooter>
          </form>
        );
      case 'update-password':
        return (
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Reset Password
          </CardTitle>
          <CardDescription>
            {stage === 'enter-phone' && 'Enter your mobile number to receive an OTP.'}
            {stage === 'enter-otp' && `An OTP has been sent to +91${mobile}.`}
            {stage === 'update-password' && 'Enter your new password.'}
          </CardDescription>
        </CardHeader>
        {renderStage()}
        <div className="text-center text-sm pb-4">
          <Link to="/login" className="underline">
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;