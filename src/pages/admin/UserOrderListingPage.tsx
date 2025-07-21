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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, Trash2, Image as ImageIcon, ArrowDownWideNarrow, ArrowUpWideNarrow, Download, ListChecks, Upload, ShoppingCart, Calendar as CalendarIcon, Search } from 'lucide-react'; // Added Search icon
import { format } from 'date-fns';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Papa from 'papaparse'; // Import PapaParse
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  user_id: string;
  user_email?: string | null;
  type: string;
  comment: string | null;
  ordered_design_data: any; // Added for export/import
}

interface UserListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

const OrderManagementPage = () => {
  const { session, loading: sessionLoading } = useSession();
  const [searchParams] = useSearchParams(); // Initialize useSearchParams
  const initialStatusFilter = searchParams.get('status') || 'all'; // Get status from URL

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false); // Renamed state
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState<string>(''); // Renamed state
  const [editCustomerName, setEditCustomerName] = useState(''); // New state
  const [editCustomerAddress, setEditCustomerAddress] = useState(''); // New state
  const [editCustomerPhone, setEditCustomerPhone] = useState(''); // New state
  const [editPaymentMethod, setEditPaymentMethod] = useState(''); // New state
  const [editComment, setEditComment] = useState('');
  const [userName, setUserName] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string>('all');
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [normalOrderCount, setNormalOrderCount] = useState<number | null>(null);
  const [demoOrderCount, setDemoOrderCount] = useState<number | null>(null);
  const [processingOrderCount, setProcessingOrderCount] = useState<number | null>(null); // New state for processing count
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter); // New state for status filter
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<string>('');
  const importFileInputRef = useRef<HTMLInputElement>(null); // Ref for import file input
  const [searchQuery, setSearchQuery] = useState('');
  const debounceTimeoutRef = useRef<number | null>(null);

  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Demo'];
  const paymentMethods = ['Prepaid', 'COD']; // Updated payment methods

  const fetchOrdersAndCounts = async () => {
    setLoading(true);
    setError(null);
    setSelectedOrderIds(new Set());

    // Explicitly get the latest session before invoking
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      console.error("OrderManagementPage: Error getting session before invoke:", getSessionError);
      showError("Failed to get current session. Please try logging in again.");
      setLoading(false);
      return;
    }

    if (!currentSession || !currentSession.access_token) {
      showError("Authentication required to fetch orders.");
      setLoading(false);
      return;
    }

    try {
      const { data: countsData, error: countsInvokeError } = await supabase.functions.invoke('get-order-counts', {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`, // Use the fresh token
        },
      });

      if (countsInvokeError) {
        console.error("Edge Function Invoke Error (get-order-counts):", countsInvokeError);
        showError(`Failed to load order counts: ${countsInvokeError.message}`);
        setNormalOrderCount(null);
        setDemoOrderCount(null);
        setProcessingOrderCount(null); // Reset processing count on error
      } else if (countsData) {
        setNormalOrderCount(countsData.normalOrders);
        setDemoOrderCount(countsData.demoOrders);
        setProcessingOrderCount(countsData.processingOrders); // Set processing count
      }

      const payload: { orderType: string; userId: string | null; startDate: string | null; endDate: string | null; status?: string | null; searchQuery?: string | null } = {
        orderType: orderTypeFilter,
        userId: selectedUserIdFilter === 'all' ? null : selectedUserIdFilter,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        searchQuery: searchQuery || null,
      };

      // Add status filter to payload
      if (statusFilter === 'all') {
        // For the main view, we want to see everything EXCEPT processing orders.
        payload.status = 'non-processing';
      } else {
        payload.status = statusFilter;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('get-orders-with-user-email', {
        body: payload,
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`, // Use the fresh token
        },
      });

      if (invokeError) {
        console.error("Edge Function Invoke Error (get-orders-with-user-email):", invokeError);
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
        showError(`Failed to load orders: ${errorMessage}`);
        setError(errorMessage);
      } else if (data && data.orders) {
        let sortedData = data.orders || [];
        sortedData.sort((a: Order, b: Order) => {
          let valA: any;
          let valB: any;

          if (sortColumn === 'user_email') {
            valA = a.user_email || '';
            valB = b.user_email || '';
          } else if (sortColumn === 'customer_name') {
            valA = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim() || a.customer_name;
            valB = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`.trim() || b.customer_name;
          } else {
            valA = a[sortColumn as keyof Order];
            valB = b[sortColumn as keyof Order];
          }

          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;

          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
          }
          
          if (sortColumn === 'created_at') {
             const dateA = new Date(valA as string);
             const dateB = new Date(valB as string);
             return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
          }

          return sortDirection === 'asc' 
            ? String(valA).localeCompare(String(valB)) 
            : String(valB).localeCompare(String(valA));
        });
        setOrders(sortedData);
        setUserList(data.users || []);
      } else {
        showError("Unexpected response from server when fetching orders.");
        setError("Unexpected response from server.");
      }
    } catch (err: any) {
      console.error("Network or unexpected error:", err);
      showError(err.message || "An unexpected error occurred while fetching orders.");
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set initial status filter from URL param
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== statusFilter) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]); // Only run when searchParams change

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (!sessionLoading) {
        fetchOrdersAndCounts();
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [sortColumn, sortDirection, orderTypeFilter, selectedUserIdFilter, sessionLoading, startDate, endDate, statusFilter, searchQuery]); // Add searchQuery

  const openImageModal = (imageUrl: string | null) => {
    if (imageUrl) {
      setCurrentImageUrl(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleEditOrderClick = (order: Order) => { // Renamed function
    setCurrentOrder(order);
    setEditStatus(order.status);
    setEditCustomerName(order.customer_name);
    setEditCustomerAddress(order.customer_address);
    setEditCustomerPhone(order.customer_phone);
    setEditPaymentMethod(order.payment_method);
    setEditComment(order.comment || '');
    setIsEditOrderModalOpen(true); // Renamed state
  };

  const handleSaveOrderEdit = async () => { // Renamed function
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

    if (error) {
      console.error("Error updating order:", error);
      showError(`Failed to update order: ${error.message}`);
    } else {
      showSuccess("Order updated successfully!");
      setIsEditOrderModalOpen(false); // Renamed state
      fetchOrdersAndCounts();
    }
    dismissToast(toastId);
    setLoading(false);
  };

  const deleteSingleOrder = async (id: string, imageUrl: string | null) => {
    if (imageUrl && imageUrl.startsWith('https://smpjbedvyqensurarrym.supabase.co/storage/v1/object/public/order-mockups/')) {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('order-mockups')
          .remove([`orders/${fileName}`]);
        if (storageError) {
          console.error("Error deleting order image from storage:", storageError);
          showError(`Failed to delete order image from storage: ${storageError.message}`);
          return false;
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
      return false;
    }
    return true;
  };

  const handleDeleteOrder = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    const toastId = showLoading("Deleting order...");
    const success = await deleteSingleOrder(id, imageUrl);
    if (success) {
      showSuccess("Order deleted successfully!");
      fetchOrdersAndCounts();
    } else {
      showError("Failed to delete order.");
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

  const handleBulkDelete = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No orders selected. Please select at least one order to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedOrderIds.size} selected orders? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const toastId = showLoading(`Deleting ${selectedOrderIds.size} orders...`);
    let successfulDeletions = 0;
    let failedDeletions = 0;

    for (const orderId of selectedOrderIds) {
      const orderToDelete = orders.find(o => o.id === orderId);
      if (orderToDelete) {
        const success = await deleteSingleOrder(orderId, orderToDelete.ordered_design_image_url);
        if (success) {
          successfulDeletions++;
        } else {
          failedDeletions++;
        }
      }
    }

    fetchOrdersAndCounts();
    dismissToast(toastId);
    setLoading(false);
    if (failedDeletions === 0) {
      showSuccess(`${successfulDeletions} orders deleted successfully!`);
    } else if (successfulDeletions > 0) {
      showError(`${successfulDeletions} orders deleted, but ${failedDeletions} failed.`);
    } else {
      showError("Failed to delete any selected orders.");
    }
  };

  const handleBulkDownloadDesigns = async () => {
    if (selectedOrderIds.size === 0) {
      showError("No designs selected. Please select at least one order to download its design.");
      return;
    }

    setLoading(true);
    const toastId = showLoading(`Preparing ${selectedOrderIds.size} designs for download...`);
    const zip = new JSZip();
    let downloadedCount = 0;
    let failedCount = 0;

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
          failedCount++;
        }
      } else {
        failedCount++;
      }
    });

    await Promise.all(downloadPromises);

    if (downloadedCount > 0) {
      zip.generateAsync({ type: "blob" })
        .then(function (content) {
          saveAs(content, "selected_designs.zip");
          showSuccess(`${downloadedCount} designs downloaded successfully!`);
        })
        .catch(err => {
          console.error("Error generating zip file:", err);
          showError("Error generating zip file for download.");
        });
    } else {
      showError("No designs were successfully downloaded.");
    }
    dismissToast(toastId);
    setLoading(false);
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
        'Order Total': order.total_price?.toFixed(2) || '0.00', // Added Order Total
      }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `addresses_${userId || 'all'}.csv`);
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
    saveAs(blob, `all_orders_export.csv`);
    showSuccess("All orders exported successfully!");
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
            fetchOrdersAndCounts(); // Refresh the list
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
      fetchOrdersAndCounts(); // Refresh the list
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
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Order Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setOrderTypeFilter('normal');
            setStatusFilter('all');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{normalOrderCount !== null ? normalOrderCount : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Total non-demo orders</p>
          </CardContent>
        </Card>
        <Link to="/admin/demo-users" className="block">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demo Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{demoOrderCount !== null ? demoOrderCount : 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Total demo orders</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/all-processing-orders" className="block">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processingOrderCount !== null ? processingOrderCount : 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Orders currently being processed</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <CardTitle>All Orders</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {selectedOrderIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleBulkDownloadDesigns}
                  disabled={loading}
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" /> Download Designs ({selectedOrderIds.size})
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={loading}
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedOrderIds.size})
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
            <div className="flex items-center space-x-2">
              <Label htmlFor="order-type-filter" className="text-sm">Type:</Label>
              <Select value={orderTypeFilter} onValueChange={(value) => setOrderTypeFilter(value)}>
                <SelectTrigger id="order-type-filter" className="w-[150px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="status-filter" className="text-sm">Status:</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger id="status-filter" className="w-[150px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {orderStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="user-email-filter" className="text-sm">User:</Label>
              <Select value={selectedUserIdFilter} onValueChange={(value) => setSelectedUserIdFilter(value)}>
                <SelectTrigger id="user-email-filter" className="w-[200px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {userList.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">No orders found for the selected filters.</p>
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
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('customer_name')}>
                          <div className="flex items-center">Customer Name {getSortIcon('customer_name')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('user_email')}>
                          <div className="flex items-center">User Email {getSortIcon('user_email')}</div>
                        </TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('type')}>
                          <div className="flex items-center">Type {getSortIcon('type')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('payment_method')}>
                          <div className="flex items-center">Payment Method {getSortIcon('payment_method')}</div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('total_price')}>
                          <div className="flex items-center justify-end">Total {getSortIcon('total_price')}</div>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrderIds.has(order.id)}
                              onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                              aria-label={`Select order ${order.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs">{order.display_id || `${order.id.substring(0, 8)}...`}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                          <TableCell>
                            <Link to={`/admin/orders/${order.user_id}`} className="text-blue-600 hover:underline">
                              {order.profiles?.first_name || 'N/A'} {order.profiles?.last_name || ''}
                            </Link>
                          </TableCell>
                          <TableCell>{order.user_email || 'N/A'}</TableCell>
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
                            <QuickCommentEditor order={order} onUpdate={fetchOrdersAndCounts} />
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
                              onClick={() => handleEditOrderClick(order)} // Renamed function
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

      <Dialog open={isEditOrderModalOpen} onOpenChange={setIsEditOrderModalOpen}> {/* Renamed state */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order Details</DialogTitle> {/* Changed title */}
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

export default OrderManagementPage;