import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';

interface ProcessedOrderUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  processed_order_count: number;
}

const ProcessedOrdersByUserPage = () => {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ProcessedOrderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProcessedOrderUsers = async () => {
      setLoading(true);
      setError(null);

      const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

      if (getSessionError) {
        console.error("ProcessedOrdersByUserPage: Error getting session before invoke:", getSessionError);
        showError("Failed to get current session. Please try logging in again.");
        setLoading(false);
        return;
      }

      if (!currentSession || !currentSession.access_token) {
        console.log("ProcessedOrdersByUserPage: No active session found, redirecting to login.");
        showError("Your session has expired or is invalid. Please log in again.");
        navigate('/login');
        setLoading(false);
        return;
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-processed-order-users-with-counts', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
          },
        });

        if (invokeError) {
          console.error("Edge Function Invoke Error (get-processed-order-users-with-counts):", invokeError);
          let errorMessage = invokeError.message;
          if (invokeError.context?.data) {
            try {
              const parsedError = JSON.parse(invokeError.context.data);
              if (parsedError.error) {
                errorMessage = parsedError.error;
              }
            } catch (e) {
              // Fallback if context.data is not JSON
            }
          }
          showError(`Failed to load processed order users: ${errorMessage}`);
          setError(errorMessage);
        } else if (data && data.users) {
          setUsers(data.users || []);
        } else {
          showError("Unexpected response from server when fetching processed order users.");
          setError("Unexpected response from server.");
        }
      } catch (err: any) {
        console.error("Network or unexpected error:", err);
        showError(err.message || "An unexpected error occurred while fetching processed order users.");
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    if (!sessionLoading) {
      fetchProcessedOrderUsers();
    }
  }, [sessionLoading, navigate]);

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/admin" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Processed Orders by User</h1>
      </div>

      {error && (
        <p className="text-red-500">Error: {error}</p>
      )}

      {!error && (
        <>
          {users.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">No users with processed orders found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <Link key={user.id} to={`/admin/orders/${user.id}?status=Processing`} className="block">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium">
                        {user.first_name || 'Unknown'} {user.last_name || 'User'}
                      </CardTitle>
                      <User className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center mt-2">
                        <ShoppingCart className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-base font-semibold">{user.processed_order_count} Processed Orders</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProcessedOrdersByUserPage;