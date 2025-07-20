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
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'enter-mobile' | 'enter-otp'>('enter-mobile');
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

    if (error) {
      showError(error.message);
    } else {
      showSuccess('OTP sent to your mobile number.');
      setStep('enter-otp');
    }
    setLoading(false);
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

    if (error) {
      showError(error.message);
    } else if (data.session) {
      showSuccess('Signed in successfully!');
      navigate('/');
    } else {
      showError('Could not verify OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {step === 'enter-mobile' ? 'Sign Up / Sign In with Mobile' : 'Verify OTP'}
          </CardTitle>
          <CardDescription>
            {step === 'enter-mobile' 
              ? 'Enter your mobile number to get started.'
              : `Enter the 6-digit OTP sent to +91${mobile}`}
          </CardDescription>
        </CardHeader>
        {step === 'enter-mobile' ? (
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
              <div className="text-center text-sm">
                Prefer to use email?{' '}
                <Link to="/login" className="underline">
                  Sign in with Email
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  required
                  maxLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify OTP & Continue
              </Button>
              <Button variant="link" onClick={() => setStep('enter-mobile')}>
                Change mobile number
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
};

export default MobileSignUp;