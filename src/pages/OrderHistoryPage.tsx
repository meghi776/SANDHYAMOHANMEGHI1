import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Image as ImageIcon, ArrowDownWideNarrow, ArrowUpWideNarrow, Calendar as CalendarIcon, XCircle, LogOut, Edit, KeyRound } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import OrderHistoryCard from '@/components/OrderHistoryCard';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components

interface Order {
  id: string;
  display_id: string | null;
  created_at: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  payment_method: string;
  status: string;
  total_price: number;
  ordered_design_image_url: string | null;
  products: { name: string } | null;
  type: string;
  comment: string | null;
}

const OrderHistoryPage = () => {
  const { user, loading: sessionLoading } = useSession();
  const [rawOrders, setRawOrders] = useState<Order[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [filterOption, setFilterOption] = useState<string>('all'); // This will now control the active tab
  const [sortColumn, setSortColumn] = useState<keyof Order | 'product_name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // States for counts
  const [allOrdersCount, setAllOrdersCount] = useState<number | null>(null);
  const [demoOrdersCount, setDemoOrdersCount] = useState<number | null>(null);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number | null>(null);
  const [processingOrdersCount, setProcessingOrdersCount] = useState<number | null>(null);

  // States for user-side order edit modal
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [userEditCurrentOrder, setUserEditCurrentOrder] = useState<Order | null>(null);
  const [userEditCustomerName, setUserEditCustomerName] = useState('');
  const [userEditCustomerAddress, setUserEditCustomerAddress] = useState('');
  const [userEditCustomerPhone, setUserEditCustomerPhone] = useState('');
  const [userEditTotalPrice, setUserEditTotalPrice] = useState<string>(''); // New state for editable price
  const [userEditComment, setUserEditComment] = useState(''); // New state for comment

  // States for change password modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const paymentMethods = ['COD']; // Updated payment methods

  // Effect to fetch all relevant orders for the user
  useEffect(() => {
    const fetchAllUserOrders = async () => {
      if (sessionLoading || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          display_id,
          created_at,
          customer_name,
          customer_address,
          customer_phone,
          payment_method,
          status,
          total_price,
          ordered_design_image_url,
          products (name),
          type,
          comment
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching orders:", error);
        setError(error.message);
        setRawOrders([]);
      } else {
        const fetchedOrders = data || [];
        setRawOrders(fetchedOrders);

        // Calculate counts from fetched orders
        let allCount = 0;
        let demoCount = 0;
        let completedCount = 0;
        let processingCount = 0;

        fetchedOrders.forEach(order => {
          allCount++;
          if (order.type === 'demo' && order.status === 'Demo') demoCount++;
          if (order.status === 'Delivered') completedCount++;
          if (order.status === 'Processing') processingCount++;
        });

        setAllOrdersCount(allCount);
        setDemoOrdersCount(demoCount);
        setCompletedOrdersCount(completedCount);
        setProcessingOrdersCount(processingCount);
      }
      setLoading(false);
    };

    fetchAllUserOrders();
  }, [user, sessionLoading]);

  // Effect to filter and sort rawOrders for display
  useEffect(() => {
    let currentFilteredOrders = [...rawOrders];

    // Apply filter option
    switch (filterOption) {
      case 'demo':
        currentFilteredOrders = currentFilteredOrders.filter(o => o.type === 'demo' && o.status === 'Demo');
        break;
      case 'completed':
        currentFilteredOrders = currentFilteredOrders.filter(o => o.status === 'Delivered');
        break;
      case 'processing':
        currentFilteredOrders = currentFilteredOrders.filter(o => o.status === 'Processing');
        break;
      // 'all' case means no further filtering needed here
    }

    // Apply date range filter
    if (startDate) {
      currentFilteredOrders = currentFilteredOrders.filter(order => new Date(order.created_at) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      currentFilteredOrders = currentFilteredOrders.filter(order => new Date(order.created_at) <= endOfDay);
    }

    // Apply sorting
    currentFilteredOrders.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortColumn === 'product_name') {
        valA = a.products?.name || '';
        valB = b.products?.name || '';
      } else {
        valA = a[sortColumn as keyof Order];
        valB = b[sortColumn as keyof Order];
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - a;
      }
      if (sortColumn === 'created_at') {
        const dateA = new Date(valA);
        const dateB = new Date(valB);
        return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }
      return 0;
    });

    setDisplayedOrders(currentFilteredOrders);
  }, [rawOrders, filterOption, sortColumn, sortDirection, startDate, endDate]);


  const openImageModal = (imageUrl: string | null) => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }

    const toastId = showLoading("Cancelling order...");
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('id', orderId)
        .eq('user_id', user?.id)
        .eq('status', 'Demo'); // Ensure only 'Demo' orders can be cancelled by user

      if (error) {
        throw error;
      }

      showSuccess("Order cancelled successfully.");
      // Update rawOrders to reflect the change, which will trigger re-filtering
      setRawOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' } : o));
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      showError(`Failed to cancel order: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleEditOrder = (order: Order) => {
    setUserEditCurrentOrder(order);
    setUserEditCustomerName(order.customer_name);
    setUserEditCustomerAddress(order.customer_address);
    setUserEditCustomerPhone(order.customer_phone);
    setUserEditTotalPrice(order.total_price?.toFixed(2) || ''); // Set price for editing
    setUserEditComment(order.comment || ''); // Set comment for editing
    setIsUserEditModalOpen(true);
  };

  const handleSaveUserOrderEdit = async () => {
    if (!userEditCurrentOrder || !userEditCustomerName.trim() || !userEditCustomerAddress.trim() || !userEditCustomerPhone.trim() || !userEditTotalPrice.trim()) {
      showError("All fields are required.");
      return;
    }

    const parsedPrice = parseFloat(userEditTotalPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      showError("Please enter a valid positive price.");
      return;
    }

    const toastId = showLoading("Saving order changes...");
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: userEditCustomerName.trim(),
          customer_address: userEditCustomerAddress.trim(),
          customer_phone: userEditCustomerPhone.trim(),
          total_price: parsedPrice, // Update price
          comment: userEditComment.trim() === '' ? null : userEditComment.trim(), // Update comment
        })
        .eq('id', userEditCurrentOrder.id)
        .eq('user_id', user?.id)
        .eq('status', 'Demo'); // Ensure user can only edit 'Demo' orders

      if (error) {
        if (error.code === '42501') { // RLS policy violation
          throw new Error("You can only edit demo orders.");
        }
        throw error;
      }

      showSuccess("Order details updated successfully!");
      setIsUserEditModalOpen(false);
      // Update rawOrders to reflect the change, which will trigger re-filtering
      setRawOrders(prevOrders => prevOrders.map(o => o.id === userEditCurrentOrder.id ? { ...o, customer_name: userEditCustomerName, customer_address: userEditCustomerAddress, customer_phone: userEditCustomerPhone, total_price: parsedPrice, comment: userEditComment } : o));
    } catch (err: any) {
      console.error("Error saving user order edit:", err);
      showError(`Failed to save changes: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleSort = (column: keyof Order | 'product_name') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: keyof Order | 'product_name') => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUpWideNarrow className="ml-1 h-3 w-3" /> : <ArrowDownWideNarrow className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  const handleSignOut = async () => {
    const toastId = showLoading("Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Check for the specific "Auth session missing!" error
      if (error.message === "Auth session missing!") {
        showSuccess("You have been successfully signed out.");
      } else {
        showError(`Failed to sign out: ${error.message}`);
      }
    } else {
      showSuccess("Signed out successfully!");
    }
    dismissToast(toastId);
    navigate('/login'); // Redirect to login page
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    const toastId = showLoading("Updating password...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    dismissToast(toastId);
    if (error) {
      showError(`Failed to update password: ${error.message}`);
    } else {
      showSuccess("Password updated successfully!");
      setIsChangePasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Please log in to view your order history.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Your Orders</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setIsChangePasswordModalOpen(true)} variant="outline">
            <KeyRound className="mr-2 h-4 w-4" /> Change Password
          </Button>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      <Tabs value={filterOption} onValueChange={setFilterOption} className="w-full">
        <TabsList className="grid w-full grid-cols-4"> {/* Adjusted grid-cols for 4 tabs */}
          <TabsTrigger value="all">All ({allOrdersCount ?? '...'})</TabsTrigger>
          <TabsTrigger value="demo">Demo ({demoOrdersCount ?? '...'})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({processingOrdersCount ?? '...'})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedOrdersCount ?? '...'})</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-2 mt-4 mb-6"> {/* Moved date filters here */}
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date > new Date() || (startDate && date < startDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedOrders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">No orders found for the selected filters.</p>
              ) : isMobile ? (
                <div className="space-y-4">
                  {displayedOrders.map((order) => (
                    <OrderHistoryCard key={order.id} order={order} onViewImage={openImageModal} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('product_name')}>
                          <div className="flex items-center">Product {getSortIcon('product_name')}</div>
                        </TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('total_price')}>
                          <div className="flex items-center justify-end">Total {getSortIcon('total_price')}</div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>{order.products?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {order.ordered_design_image_url ? (
                              <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                                <ImageIcon className="h-4 w-4" /> View
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{order.type}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{order.customer_address}</TableCell>
                          <TableCell>{order.customer_phone}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-red-500 text-xs max-w-[150px] truncate" title={order.comment || ''}>
                            {order.comment || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {order.status === 'Demo' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-1"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Edit className="mr-1 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <XCircle className="mr-1 h-4 w-4" /> Cancel
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle>Demo Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedOrders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">No demo orders found for the selected filters.</p>
              ) : isMobile ? (
                <div className="space-y-4">
                  {displayedOrders.map((order) => (
                    <OrderHistoryCard key={order.id} order={order} onViewImage={openImageModal} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('product_name')}>
                          <div className="flex items-center">Product {getSortIcon('product_name')}</div>
                        </TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('total_price')}>
                          <div className="flex items-center justify-end">Total {getSortIcon('total_price')}</div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>{order.products?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {order.ordered_design_image_url ? (
                              <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                                <ImageIcon className="h-4 w-4" /> View
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{order.customer_address}</TableCell>
                          <TableCell>{order.customer_phone}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-red-500 text-xs max-w-[150px] truncate" title={order.comment || ''}>
                            {order.comment || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {order.status === 'Demo' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-1"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Edit className="mr-1 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <XCircle className="mr-1 h-4 w-4" /> Cancel
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedOrders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">No processing orders found for the selected filters.</p>
              ) : isMobile ? (
                <div className="space-y-4">
                  {displayedOrders.map((order) => (
                    <OrderHistoryCard key={order.id} order={order} onViewImage={openImageModal} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('product_name')}>
                          <div className="flex items-center">Product {getSortIcon('product_name')}</div>
                        </TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('total_price')}>
                          <div className="flex items-center justify-end">Total {getSortIcon('total_price')}</div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>{order.products?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {order.ordered_design_image_url ? (
                              <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                                <ImageIcon className="h-4 w-4" /> View
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{order.customer_address}</TableCell>
                          <TableCell>{order.customer_phone}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-red-500 text-xs max-w-[150px] truncate" title={order.comment || ''}>
                            {order.comment || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {order.status === 'Demo' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-1"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Edit className="mr-1 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <XCircle className="mr-1 h-4 w-4" /> Cancel
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedOrders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">No completed orders found for the selected filters.</p>
              ) : isMobile ? (
                <div className="space-y-4">
                  {displayedOrders.map((order) => (
                    <OrderHistoryCard key={order.id} order={order} onViewImage={openImageModal} onCancelOrder={handleCancelOrder} onEditOrder={handleEditOrder} />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('product_name')}>
                          <div className="flex items-center">Product {getSortIcon('product_name')}</div>
                        </TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('total_price')}>
                          <div className="flex items-center justify-end">Total {getSortIcon('total_price')}</div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>{order.products?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {order.ordered_design_image_url ? (
                              <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                                <ImageIcon className="h-4 w-4" /> View
                              </Button>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{order.customer_address}</TableCell>
                          <TableCell>{order.customer_phone}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-red-500 text-xs max-w-[150px] truncate" title={order.comment || ''}>
                            {order.comment || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {order.status === 'Demo' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-1"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Edit className="mr-1 h-4 w-4" /> Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <XCircle className="mr-1 h-4 w-4" /> Cancel
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ordered Design</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            {currentImageUrl ? (
              <img src={currentImageUrl} alt="Ordered Design" className="max-w-full h-auto border rounded-md" />
            ) : (
              <p>No image available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* User-side Edit Order Dialog */}
      <Dialog open={isUserEditModalOpen} onOpenChange={setIsUserEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Your Order</DialogTitle>
            <DialogDescription>
              You can edit your details for demo orders. Other details are read-only.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-order-id" className="text-right">
                Order ID
              </Label>
              <p id="user-order-id" className="col-span-3 font-medium">{userEditCurrentOrder?.display_id || `${userEditCurrentOrder?.id.substring(0, 8)}...`}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-product-name" className="text-right">
                Product
              </Label>
              <p id="user-product-name" className="col-span-3">{userEditCurrentOrder?.products?.name || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-order-status" className="text-right">
                Status
              </Label>
              <p id="user-order-status" className="col-span-3">{userEditCurrentOrder?.status}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-customer-name" className="text-right">
                Name
              </Label>
              <Input
                id="user-customer-name"
                value={userEditCustomerName}
                onChange={(e) => setUserEditCustomerName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-customer-address" className="text-right">
                Address
              </Label>
              <Textarea
                id="user-customer-address"
                value={userEditCustomerAddress}
                onChange={(e) => setUserEditCustomerAddress(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-customer-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="user-customer-phone"
                value={userEditCustomerPhone}
                onChange={(e) => setUserEditCustomerPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-total-price" className="text-right">
                Total Price
              </Label>
              <Input
                id="user-total-price"
                type="number"
                step="0.01"
                value={userEditTotalPrice}
                onChange={(e) => setUserEditTotalPrice(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-comment" className="text-right">
                Comment
              </Label>
              <Textarea
                id="user-comment"
                value={userEditComment}
                onChange={(e) => setUserEditComment(e.target.value)}
                className="col-span-3"
                placeholder="Add a comment for this order..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUserOrderEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirm-password" className="text-right">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordModalOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderHistoryPage;