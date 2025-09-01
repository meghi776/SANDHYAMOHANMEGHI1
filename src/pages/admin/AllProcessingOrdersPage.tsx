import React, { useEffect, useState, useRef } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowDownWideNarrow, ArrowUpWideNarrow, Download, ArrowLeft, ListChecks, Upload, ShoppingCart, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { addTextToImage } from '@/utils/imageUtils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import QuickCommentEditor from '@/components/admin/QuickCommentEditor';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  profiles: { first_name: string | null; last_name: string | null; phone: string | null; } | null;
  user_id: string;
  user_email?: string | null;
  type: string;
  comment: string | null;
  ordered_design_data: any; // Added for export/import
}

const AllProcessingOrdersPage = () => {
  const { session, loading: sessionLoading } = useSession();
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
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined); // New state for start date
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);     // New state for end date
  const importFileInputRef = useRef<HTMLInputElement>(null); // Ref for import file input

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo'];
  const paymentMethods = ['COD'];

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    setSelectedOrderIds(new Set());

    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError || !currentSession) {
      showError("Authentication required to fetch orders.");
      setLoading(false);
      return;
    }

    try {
      let query = supabase.functions.invoke('get-processing-orders', {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      const { data, error: invokeError } = await query;

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data && data.orders) {
        let filteredData = data.orders || [];

        // Apply date range filter
        if (startDate) {
          filteredData = filteredData.filter((order: Order) => new Date(order.created_at) >= startDate);
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          filteredData = filteredData.filter((order: Order) => new Date(order.created_at) <= endOfDay);
        }

        filteredData.sort((a: Order, b: Order) => {
          let valA: any = a[sortColumn as keyof Order];
          let valB: any = b[sortColumn as keyof Order];
          
          if (sortColumn === 'created_at') {
            const dateA = new Date(valA as string);
            const dateB = new Date(valB as string);
            return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          }

          if (sortDirection === 'asc') {
            return valA > valB ? 1 : -1;
          } else {
            return valA < valB ? 1 : -1;
          }
        });
        setOrders(filteredData);
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: any) {
      showError(`Failed to load processing orders: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      fetchOrders();
    }
  }, [sessionLoading, sortColumn, sortDirection, startDate, endDate]); // Add startDate and endDate to dependencies

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
    if (!currentOrder) return;

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
      showError(`Failed to update order: ${error.message}`);
    } else {
      showSuccess("Order updated successfully!");
      setIsEditOrderModalOpen(false);
      fetchOrders();
    }
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;

    const toastId = showLoading("Deleting order...");
    if (imageUrl) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('order-mockups').remove([`orders/${fileName}`]);
      }
    }
    const { error } = await supabase.from('orders').delete().eq('id', id);
    dismissToast(toastId);
    if (error) {
      showError(`Failed to delete order: ${error.message}`);
    } else {
      showSuccess("Order deleted successfully!");
      fetchOrders();
    }
  };

  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    setSelectedOrderIds(prev => {
      const newSelection = new Set(prev);
      if (isChecked) newSelection.add(orderId);
      else newSelection.delete(orderId);
      return newSelection;
    });
  };

  const handleSelectAllOrders = (isChecked: boolean) => {
    setSelectedOrderIds(isChecked ? new Set(orders.map(order => order.id)) : new Set());
  };

  const handleBulkDownloadDesigns = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No designs selected.");
      return;
    }

    const toastId = showLoading(`Preparing ${selectedOrderIds.size} designs...`);
    const zip = new JSZip();
    let downloadedCount = 0;

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
        }
      }
    });

    await Promise.all(downloadPromises);
    dismissToast(toastId);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, "processing_designs.zip");
        showSuccess(`${downloadedCount} designs downloaded.`);
      });
    } else {
      showError("No designs could be downloaded.");
    }
  };

  const handleDownloadAllDesigns = async () => {
    if (orders.length === 0) {
      showError("No orders to download designs from.");
      return;
    }

    const toastId = showLoading(`Preparing all ${orders.length} designs for download...`);
    const zip = new JSZip();
    let downloadedCount = 0;

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
        }
      }
    });

    await Promise.all(downloadPromises);
    dismissToast(toastId);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, "all_processing_designs.zip");
        showSuccess(`${downloadedCount} designs downloaded.`);
      });
    } else {
      showError("No designs could be downloaded.");
    }
  };

  const handleBulkDownloadAddresses = () => {
    if (selectedOrderIds.size === 0) {
      showError("No orders selected.");
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
        'Order Total': order.total_price?.toFixed(2) || '0.00', // Added Order Total
      }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `processing_addresses.csv`);
    showSuccess(`${dataToExport.length} addresses exported.`);
  };

  const handleExportAllOrders = () => {
    const dataToExport = orders.map(order => ({
      id: order.id,
      display_id: order.display_id || '',
      created_at: order.created_at,
      user_id: order.user_id,
      user_email: order.user_email || '',
      product_id: order.product_id || '',
      product_name: order.products?.name || '',
      customer_name: order.customer_name,
      customer_address: order.customer_address,
      customer_phone: order.customer_phone,
      payment_method: order.payment_method,
      status: order.status,
      total_price: order.total_price || 0,
      ordered_design_image_url: order.ordered_design_image_url || '',
      ordered_design_data: JSON.stringify(order.ordered_design_data), // Stringify JSONB
      type: order.type,
      comment: order.comment || '',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `processing_orders_export.csv`);
    showSuccess("All processing orders exported successfully!");
  };

  const handleImportOrders = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      showError("No file selected. Please select a CSV file to import.");
      return;
    }

    if (file.type !== 'text/csv') {
      showError("Invalid file type. Please upload a CSV file.");
      return;
    }

    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError || !currentSession || !currentSession.access_token) {
      showError("Authentication required to import orders. Please log in again.");
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      return;
    }

    setLoading(true);
    const toastId = showLoading("Importing orders...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          console.error("CSV Parsing Errors:", results.errors);
          showError("CSV parsing failed. Check console for details.");
          dismissToast(toastId);
          setLoading(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
          return;
        }

        const ordersToUpsert = results.data.map((row: any) => ({
          id: row.id || undefined, // Allow new IDs to be generated
          user_id: row.user_id,
          product_id: row.product_id || null,
          customer_name: row.customer_name,
          customer_address: row.customer_address,
          customer_phone: row.customer_phone,
          payment_method: row.payment_method,
          status: row.status,
          total_price: parseFloat(row.total_price),
          ordered_design_image_url: row.ordered_design_image_url || null,
          ordered_design_data: row.ordered_design_data || null, // Keep as string, Edge Function will parse
          type: row.type,
          display_id: row.display_id || null,
          comment: row.comment || null,
        }));

        if (ordersToUpsert.length === 0) {
          showError("No valid orders found in the CSV to import.");
          dismissToast(toastId);
          setLoading(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
          return;
        }

        try {
          const { data, error: invokeError } = await supabase.functions.invoke('bulk-upsert-orders', {
            body: { orders: ordersToUpsert },
            headers: {
              'Authorization': `Bearer ${currentSession.access_token}`,
            },
          });

          if (invokeError) {
            console.error("Edge Function Invoke Error (bulk-upsert-orders):", invokeError);
            let errorMessage = invokeError.message;
            if (invokeError.context?.data) {
              try {
                const parsedError = typeof invokeError.context.data === 'string' ? JSON.parse(invokeError.context.data) : invokeError.context.data;
                if (parsedError.error) {
                  errorMessage = parsedError.error;
                }
              } catch (e) { /* ignore */ }
            }
            showError(`Failed to import orders: ${errorMessage}`);
          } else if (data) {
            if (data.failedUpserts > 0) {
              showError(`Import complete! Successfully imported ${data.successfulUpserts} orders. Failed: ${data.failedUpserts}. Check console for details.`);
              console.error("Bulk Upsert Errors:", data.errors);
            } else {
              showSuccess(`Import complete! Successfully imported ${data.successfulUpserts} orders.`);
            }
            fetchOrders(); // Refresh the list
          } else {
            showError("Unexpected response from server during order import.");
          }
        } catch (err: any) {
          console.error("Network or unexpected error during order import:", err);
          showError(err.message || "An unexpected error occurred during order import.");
        } finally {
          dismissToast(toastId);
          setLoading(false);
          if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
      },
      error: (err) => {
        console.error("CSV Parsing Error:", err);
        showError(`CSV parsing failed: ${err.message}`);
        dismissToast(toastId);
        setLoading(false);
        if (importFileInputRef.current) importFileInputRef.current.value = '';
      }
    });
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
        body: {
          orderIds: Array.from(selectedOrderIds),
          newStatus: bulkNewStatus,
        },
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (invokeError) {
        console.error("Edge Function Invoke Error (bulk-update-order-status):", invokeError);
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
        throw new Error(errorMessage);
      }

      showSuccess(`${data.updatedCount} orders updated successfully!`);
      setIsBulkStatusModalOpen(false);
      setBulkNewStatus('');
      fetchOrders(); // Refresh the list
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
        <Link to="/admin/orders" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          All Processing Orders
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Processing Orders List</CardTitle>
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
            <Button onClick={handleExportAllOrders} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export All CSV
            </Button>
            <Input
              type="file"
              accept=".csv"
              ref={importFileInputRef}
              onChange={handleImportOrders}
              className="hidden"
            />
            <Button onClick={() => importFileInputRef.current?.click()} variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal" size="sm">
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
                <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal" size="sm">
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">No processing orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAllOrders} aria-label="Select all" />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('display_id')}>
                      <div className="flex items-center">Order ID {getSortIcon('display_id')}</div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center">Date {getSortIcon('created_at')}</div>
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>User Phone</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Design</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox checked={selectedOrderIds.has(order.id)} onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)} aria-label={`Select order ${order.id}`} />
                      </TableCell>
                      <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{order.profiles?.phone || 'N/A'}</TableCell>
                      <TableCell>{order.products?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {order.ordered_design_image_url ? (
                          <Button variant="outline" size="sm" onClick={() => openImageModal(order.ordered_design_image_url)}>
                            <ImageIcon className="h-4 w-4" /> View
                          </Button>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <QuickCommentEditor order={order} onUpdate={fetchOrders} />
                      </TableCell>
                      <TableCell>{order.payment_method}</TableCell>
                      <TableCell className="text-right">₹{order.total_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditOrderClick(order)}>
                          <Eye className="h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteOrder(order.id, order.ordered_design_image_url)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Ordered Design</DialogTitle></DialogHeader>
          <div className="flex justify-center items-center py-4">
            {currentImageUrl ? <img src={currentImageUrl} alt="Ordered Design" className="max-w-full h-auto border rounded-md" /> : <p>No image available.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOrderModalOpen} onOpenChange={setIsEditOrderModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Order Details</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="order-id" className="text-right">Order ID</Label>
              <p id="order-id" className="col-span-3 font-medium">{currentOrder?.display_id || `${currentOrder?.id.substring(0, 8)}...`}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-name" className="text-right">Customer Name</Label>
              <Input id="customer-name" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-address" className="text-right">Address</Label>
              <Textarea id="customer-address" value={editCustomerAddress} onChange={(e) => setEditCustomerAddress(e.target.value)} className="col-span-3" rows={4} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-phone" className="text-right">Phone</Label>
              <Input id="customer-phone" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-method" className="text-right">Payment</Label>
              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-status" className="text-right">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select new status" /></SelectTrigger>
                <SelectContent>
                  {orderStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-comment" className="text-right">Comment</Label>
              <Textarea id="edit-comment" value={editComment} onChange={(e) => setEditComment(e.target.value)} className="col-span-3" placeholder="Add an internal comment..." />
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

export default AllProcessingOrdersPage;