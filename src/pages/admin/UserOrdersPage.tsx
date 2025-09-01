import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowLeft, ArrowDownWideNarrow, ArrowUpWideNarrow, Download, ListChecks } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { addTextToImage } from '@/utils/imageUtils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import QuickCommentEditor from '@/components/admin/QuickCommentEditor';

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
  product_id: string | null;
  products: { name: string } | null;
  profiles: { first_name: string | null; last_name: string | null; } | null;
  type: string;
  comment: string | null;
}

const UserOrdersPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const orderTypeParam = searchParams.get('type');
  const statusParam = searchParams.get('status');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editComment, setEditComment] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo'];
  const paymentMethods = ['COD', 'Demo'];

  const fetchUserAndOrders = async () => {
    if (!userId) {
      showError("User ID is missing.");
      setError("User ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedOrderIds(new Set());

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      showError("Failed to load user profile.");
      setError(profileError.message);
      setLoading(false);
      return;
    }
    setUserName(`${profileData?.first_name || 'Unknown'} ${profileData?.last_name || 'User'}`);

    let query = supabase
      .from('orders')
      .select(`
        id, display_id, created_at, customer_name, customer_address, customer_phone,
        payment_method, status, total_price, ordered_design_image_url,
        product_id, products (name), profiles (first_name, last_name), type, comment
      `)
      .eq('user_id', userId);
    
    if (orderTypeParam === 'demo') {
      query = query.eq('type', 'demo')
                   .neq('status', 'Processing')
                   .neq('status', 'Shipped')
                   .neq('status', 'Delivered')
                   .neq('status', 'Cancelled');
    } else {
      if (orderTypeParam) {
        query = query.eq('type', orderTypeParam);
      }
      if (statusParam) {
        query = query.eq('status', statusParam);
      } else {
        query = query.neq('status', 'Processing').neq('status', 'Shipped').neq('status', 'Delivered');
      }
    }

    const { data, error: ordersError } = await query.order(sortColumn, { ascending: sortDirection === 'asc' });

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      showError("Failed to load orders for this user.");
      setError(ordersError.message);
    } else {
      setOrders((data as Order[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserAndOrders();
  }, [userId, orderTypeParam, statusParam, sortColumn, sortDirection]);

  const openImageModal = (imageUrl: string | null) => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleEditOrderClick = (order: Order) => {
    setCurrentOrder(order);
    setEditStatus(order.status);
    setEditCustomerName(order.customer_name);
    setEditCustomerAddress(order.customer_address);
    setEditCustomerPhone(order.customer_phone);
    setEditPaymentMethod(order.payment_method);
    setEditComment(order.comment || '');
    setIsEditOrderModalOpen(true);
  };

  const handleSaveOrderEdit = async () => {
    if (!currentOrder || !editStatus || !editCustomerName.trim() || !editCustomerAddress.trim() || !editCustomerPhone.trim() || !editPaymentMethod.trim()) {
      showError("All fields are required.");
      return;
    }

    setLoading(true);
    const toastId = showLoading("Updating order details...");
    const { error } = await supabase
      .from('orders')
      .update({
        status: editStatus,
        customer_name: editCustomerName.trim(),
        customer_address: editCustomerAddress.trim(),
        customer_phone: editCustomerPhone.trim(),
        payment_method: editPaymentMethod.trim(),
        comment: editComment.trim() === '' ? null : editComment.trim(),
      })
      .eq('id', currentOrder.id);

    dismissToast(toastId);
    if (error) {
      console.error("Error updating order status:", error);
      showError(`Failed to update order: ${error.message}`);
    } else {
      showSuccess("Order updated successfully!");
      setIsEditOrderModalOpen(false);
      fetchUserAndOrders();
    }
    setLoading(false);
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    const toastId = showLoading("Deleting order...");

    if (imageUrl && imageUrl.startsWith('https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/order-mockups/')) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('order-mockups')
          .remove([`orders/${fileName}`]);
        if (storageError) {
          console.error("Error deleting order image from storage:", storageError);
          showError(`Failed to delete order image from storage: ${storageError.message}`);
          dismissToast(toastId);
          setLoading(false);
          return;
        }
      }
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting order:", error);
      showError(`Failed to delete order: ${error.message}`);
    } else {
      showSuccess("Order deleted successfully!");
      fetchUserAndOrders();
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    setSelectedOrderIds(prev => {
      const newSelection = new Set(prev);
      if (isChecked) {
        newSelection.add(orderId);
      } else {
        newSelection.delete(orderId);
      }
      return newSelection;
    });
  };

  const handleSelectAllOrders = (isChecked: boolean) => {
    if (isChecked) {
      const allOrderIds = new Set(orders.map(order => order.id));
      setSelectedOrderIds(allOrderIds);
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const handleBulkDownloadDesigns = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No designs selected. Please select at least one order to download its design.");
      return;
    }

    const toastId = showLoading(`Preparing ${selectedOrderIds.size} designs for download...`);
    const zip = new JSZip();
    let downloadedCount = 0;
    let failedCount = 0; // Track failed downloads

    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));

    const downloadPromises = selectedOrders.map(async (order) => {
      if (order.ordered_design_image_url) {
        try {
          const productName = order.products?.name || 'Unknown Product';
          const orderDisplayId = order.display_id || order.id;
          const blobWithText = await addTextToImage(order.ordered_design_image_url, productName, orderDisplayId);
          
          const fileName = `${orderDisplayId}.png`;
          zip.file(fileName, blobWithText);
          downloadedCount++;
        } catch (err) {
          console.error(`Failed to process design for order ${order.id}:`, err);
          failedCount++; // Increment failed count
        }
      } else {
        failedCount++; // Increment if no image URL
      }
    });

    await Promise.all(downloadPromises);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" })
        .then(function (content) {
          saveAs(content, `designs_${userId}.zip`);
          showSuccess(`${downloadedCount} designs downloaded.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`); // Report failed count
        })
        .catch(err => {
          console.error("Error generating zip file:", err);
          showError("Error generating zip file for download.");
        });
    } else {
      showError("No designs were successfully downloaded.");
    }
    dismissToast(toastId);
  };

  const handleDownloadAllDesigns = async () => {
    if (orders.length === 0) {
      showError("No orders to download designs from.");
      return;
    }

    const toastId = showLoading(`Preparing all ${orders.length} designs for download...`);
    const zip = new JSZip();
    let downloadedCount = 0;
    let failedCount = 0; // Track failed downloads

    const downloadPromises = orders.map(async (order) => {
      if (order.ordered_design_image_url) {
        try {
          const productName = order.products?.name || 'Unknown Product';
          const orderDisplayId = order.display_id || order.id;
          const blobWithText = await addTextToImage(order.ordered_design_image_url, productName, orderDisplayId);
          const fileName = `${orderDisplayId}.png`;
          zip.file(fileName, blobWithText);
          downloadedCount++;
        } catch (err) {
          console.error(`Failed to process design for order ${order.id}:`, err);
          failedCount++; // Increment failed count
        }
      } else {
        failedCount++; // Increment if no image URL
      }
    });

    await Promise.all(downloadPromises);
    dismissToast(toastId);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, `all_user_${userId}_designs.zip`);
        showSuccess(`${downloadedCount} designs downloaded.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`); // Report failed count
      });
    } else {
      showError("No designs could be downloaded.");
    }
  };

  const handleBulkDownloadAddresses = () => {
    if (selectedOrderIds.size === 0) {
      showError("No orders selected. Please select at least one order to export its address.");
      return;
    }

    const dataToExport = orders
      .filter(o => selectedOrderIds.has(o.id))
      .map(order => ({
        'Order ID': order.display_id || order.id,
        'Customer Name': order.customer_name,
        'Customer Address': order.customer_address,
        'Customer Phone': order.customer_phone,
        'Product Name': order.products?.name || 'N/A',
        'Order Date': format(new Date(order.created_at), 'yyyy-MM-dd'),
        'Order Total': order.total_price?.toFixed(2) || '0.00',
      }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `addresses_${userId}.csv`);
    showSuccess(`${dataToExport.length} addresses exported.`);
  };

  const handleBulkStatusChange = async () => {
    if (selectedOrderIds.size === 0 || !bulkNewStatus) {
      showError("No orders selected or no status chosen.");
      return;
    }

    const toastId = showLoading(`Updating ${selectedOrderIds.size} orders to "${bulkNewStatus}"...`);
    
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      dismissToast(toastId);
      showError("Authentication required.");
      return;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('bulk-update-order-status', {
        body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds),
          newStatus: bulkNewStatus,
        }),
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      showSuccess(`${data.updatedCount} orders updated successfully!`);
      setIsBulkStatusModalOpen(false);
      setBulkNewStatus('');
      fetchUserAndOrders();
    } catch (err: any) {
      showError(`Failed to update orders: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUpWideNarrow className="ml-1 h-3 w-3" /> : <ArrowDownWideNarrow className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.size === orders.length;
  const isIndeterminate = selectedOrderIds.size > 0 && selectedOrderIds.size < orders.length;

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to={orderTypeParam === 'demo' ? '/admin/demo-users' : '/admin/orders'} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          {orderTypeParam === 'demo' ? 'Demo Orders' : 'Orders'} for {userName || 'Loading...'}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Customer Orders</CardTitle>
          <div className="flex items-center space-x-2">
            {selectedOrderIds.size > 0 && (
              <>
                <Button onClick={handleBulkDownloadDesigns} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Designs ({selectedOrderIds.size})
                </Button>
                <Button onClick={handleBulkDownloadAddresses} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Download Addresses ({selectedOrderIds.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsBulkStatusModalOpen(true)}
                  disabled={loading}
                  size="sm"
                >
                  <ListChecks className="mr-2 h-4 w-4" /> Change Status ({selectedOrderIds.size})
                </Button>
              </>
            )}
            <Button onClick={handleDownloadAllDesigns} variant="outline" size="sm" disabled={orders.length === 0 || loading}>
              <Download className="mr-2 h-4 w-4" /> Download All Designs
            </Button>
            <Label htmlFor="sort-by">Sort by:</Label>
            <Select value={sortColumn} onValueChange={(value) => setSortColumn(value)}>
              <SelectTrigger id="sort-by" className="w-[180px]">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Order Date</SelectItem>
                <SelectItem value="customer_name">Customer Name</SelectItem>
                <SelectItem value="customer_phone">Phone Number</SelectItem>
                <SelectItem value="total_price">Total Price</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="payment_method">Payment Method</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? (
                <ArrowUpWideNarrow className="h-4 w-4" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          )}

          {error && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {!loading && !error && (
            <>
              {orders.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No orders found for this user.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAllOrders}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('display_id')}>
                          <div className="flex items-center">Order ID {getSortIcon('display_id')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                          <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
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
                          <TableCell>
                            <QuickCommentEditor order={order} onUpdate={fetchUserAndOrders} />
                          </TableCell>
                          <TableCell>{order.type}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditOrderClick(order)}
                            >
                              <Eye className="h-4 w-4" /> Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id, order.ordered_design_image_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={isEditOrderModalOpen} onOpenChange={setIsEditOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order-id" className="text-right">
                Order ID
              </Label>
              <p id="order-id" className="col-span-3 font-medium">{currentOrder?.display_id || `${currentOrder?.id.substring(0, 8)}...`}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-name" className="text-right">
                Product
              </Label>
              <p id="product-name" className="col-span-3">{currentOrder?.products?.name || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total-price" className="text-right">
                Total Price
              </Label>
              <p id="total-price" className="col-span-3">₹{currentOrder?.total_price?.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-name" className="text-right">
                Customer Name
              </Label>
              <Input
                id="customer-name"
                value={editCustomerName}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-address" className="text-right">
                Customer Address
              </Label>
              <Textarea
                id="customer-address"
                value={editCustomerAddress}
                onChange={(e) => setEditCustomerAddress(e.target.value)}
                className="col-span-3"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-phone" className="text-right">
                Customer Phone
              </Label>
              <Input
                id="customer-phone"
                value={editCustomerPhone}
                onChange={(e) => setEditCustomerPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-method" className="text-right">
                Payment Method
              </Label>
              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-status" className="text-right">
                Status
              </Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {orderStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-comment" className="text-right">
                Comment
              </Label>
              <Textarea
                id="edit-comment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="col-span-3"
                placeholder="Add an internal comment for this order..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOrderModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOrderEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkStatusModalOpen} onOpenChange={setIsBulkStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Change Order Status</DialogTitle>
            <DialogDescription>
              Select a new status to apply to the {selectedOrderIds.size} selected orders.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="bulk-status">New Status</Label>
            <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
              <SelectTrigger id="bulk-status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {orderStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkStatusChange} disabled={!bulkNewStatus || loading}>
              Apply Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOrdersPage;