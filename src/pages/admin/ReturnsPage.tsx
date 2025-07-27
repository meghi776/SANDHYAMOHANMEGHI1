import React, { useEffect, useState, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Video, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { deleteFileFromSupabase } from '@/utils/supabaseStorage';

interface ReturnRequest {
  id: string;
  created_at: string;
  phone_number: string;
  video_url: string | null;
  screenshot_url: string | null;
  status: string;
}

const ReturnsPage = () => {
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<ReturnRequest | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const returnStatuses = ['pending', 'approved', 'rejected'];

  const fetchReturnRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('return_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching return requests:", error);
      showError("Failed to load return requests.");
      setError(error.message);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReturnRequests();
  }, [fetchReturnRequests]);

  const handleStatusChangeClick = (request: ReturnRequest) => {
    setCurrentRequest(request);
    setNewStatus(request.status);
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!currentRequest || !newStatus) return;

    const toastId = showLoading("Updating status...");
    const { error } = await supabase
      .from('return_requests')
      .update({ status: newStatus })
      .eq('id', currentRequest.id);

    dismissToast(toastId);
    if (error) {
      showError(`Failed to update status: ${error.message}`);
    } else {
      showSuccess("Status updated successfully!");
      setIsStatusModalOpen(false);
      fetchReturnRequests();
    }
  };

  const handleDeleteRequest = async (request: ReturnRequest) => {
    if (!window.confirm("Are you sure you want to delete this return request? This will also delete the associated video and screenshot from storage.")) {
      return;
    }
    const toastId = showLoading("Deleting request...");
    try {
      // Delete files from storage first
      if (request.video_url) {
        const videoPath = new URL(request.video_url).pathname.split('/order-mockups/')[1];
        await deleteFileFromSupabase(videoPath, 'order-mockups');
      }
      if (request.screenshot_url) {
        const screenshotPath = new URL(request.screenshot_url).pathname.split('/order-mockups/')[1];
        await deleteFileFromSupabase(screenshotPath, 'order-mockups');
      }

      // Delete the database record
      const { error: dbError } = await supabase
        .from('return_requests')
        .delete()
        .eq('id', request.id);

      if (dbError) throw dbError;

      showSuccess("Return request deleted successfully!");
      fetchReturnRequests();
    } catch (err: any) {
      console.error("Error deleting return request:", err);
      showError(`Failed to delete request: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Return Requests</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Return Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Screenshot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No return requests found.</TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.phone_number}</TableCell>
                      <TableCell>{format(new Date(request.created_at), 'PPP p')}</TableCell>
                      <TableCell>
                        {request.video_url ? (
                          <a href={request.video_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><Video className="mr-2 h-4 w-4" /> View Video</Button>
                          </a>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {request.screenshot_url ? (
                          <a href={request.screenshot_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><ImageIcon className="mr-2 h-4 w-4" /> View Image</Button>
                          </a>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button variant="link" onClick={() => handleStatusChangeClick(request)} className="capitalize p-0 h-auto">
                          {request.status}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(request)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Return Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {returnStatuses.map(status => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStatus}>Save Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsPage;