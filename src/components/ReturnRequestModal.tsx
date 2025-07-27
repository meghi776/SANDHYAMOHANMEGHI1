import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadFileToSupabase, deleteFileFromSupabase } from '@/utils/supabaseStorage';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

interface ReturnRequestModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({ isOpen, onOpenChange }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setPhoneNumber('');
    setVideoFile(null);
    setScreenshotFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showError("Please enter your phone number.");
      return;
    }
    if (!videoFile) {
      showError("Please upload a video.");
      return;
    }
    if (!screenshotFile) {
      showError("Please upload a screenshot.");
      return;
    }

    setIsSubmitting(true);
    const toastId = showLoading("Submitting your request...");

    try {
      // Upload video
      const videoUrl = await uploadFileToSupabase(videoFile, 'order-mockups', 'returns/videos');
      if (!videoUrl) {
        throw new Error("Failed to upload video. Please try again.");
      }

      // Upload screenshot
      const screenshotUrl = await uploadFileToSupabase(screenshotFile, 'order-mockups', 'returns/screenshots');
      if (!screenshotUrl) {
        // Clean up already uploaded video if screenshot fails
        const videoPath = videoUrl.substring(videoUrl.indexOf('returns/videos'));
        deleteFileFromSupabase(videoPath, 'order-mockups');
        throw new Error("Failed to upload screenshot. Please try again.");
      }

      // Insert into database
      const { error: dbError } = await supabase
        .from('return_requests')
        .insert({
          phone_number: phoneNumber,
          video_url: videoUrl,
          screenshot_url: screenshotUrl,
        });

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      showSuccess("Your return request has been submitted successfully!");
      resetForm();
      onOpenChange(false);

    } catch (err: any) {
      showError(err.message || "An unexpected error occurred.");
    } finally {
      dismissToast(toastId);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request a Return</DialogTitle>
          <DialogDescription>
            Please provide the following details to initiate a return request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone-number" className="text-right">
                Phone Number
              </Label>
              <Input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="video-upload" className="text-right">
                Video
              </Label>
              <Input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files ? e.target.files[0] : null)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="screenshot-upload" className="text-right">
                Screenshot
              </Label>
              <Input
                id="screenshot-upload"
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshotFile(e.target.files ? e.target.files[0] : null)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnRequestModal;