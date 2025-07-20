import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const type = searchParams.get('type');
  const initialView = type === 'recovery' ? 'update_password' : 'sign_in';

  const redirectTo = searchParams.get('redirect_to') || '/';

  useEffect(() => {
    if (!sessionLoading && user) {
      console.log("Login.tsx: User already logged in, redirecting to:", redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, sessionLoading, navigate, redirectTo]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Welcome to Meghi
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light"
            view="sign_in"
            showLinks={false}
            redirectTo={window.location.origin + redirectTo}
          />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="underline text-primary font-medium">
              Sign up / Sign in with mobile
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;