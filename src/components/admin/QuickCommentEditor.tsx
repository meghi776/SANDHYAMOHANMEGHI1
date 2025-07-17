import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

interface Order {
  id: string;
  comment: string | null;
}

interface QuickCommentEditorProps {
  order: Order;
  onUpdate: () => void; // Callback to refresh the order list
}

const predefinedComments = [
  "Phone not lifting",
  "Pincode missing",
  "Pincode incorrect",
  "Phone number missing",
  "Phone number incorrect",
  "No name",
  "Address incorrect",
];

const QuickCommentEditor: React.FC<QuickCommentEditorProps> = ({ order, onUpdate }) => {
  const [customComment, setCustomComment] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleUpdateComment = async (comment: string | null) => {
    if (!comment || !comment.trim()) return;

    const toastId = showLoading("Updating comment...");
    const { error } = await supabase
      .from('orders')
      .update({ comment: comment.trim() })
      .eq('id', order.id);

    dismissToast(toastId);
    if (error) {
      showError(`Failed to update comment: ${error.message}`);
    } else {
      showSuccess("Comment updated successfully!");
      onUpdate(); // Refresh the list
      setIsPopoverOpen(false); // Close the popover
      setCustomComment(''); // Reset custom comment input
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs max-w-[140px] truncate" title={order.comment || ''}>
        {order.comment || 'N/A'}
      </span>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 space-y-2">
          <p className="text-sm font-medium text-center">Quick Update Comment</p>
          <Select onValueChange={(value) => handleUpdateComment(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a reason..." />
            </SelectTrigger>
            <SelectContent>
              {predefinedComments.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Or type a custom comment..."
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              className="h-8"
            />
            <Button
              size="sm"
              onClick={() => handleUpdateComment(customComment)}
              disabled={!customComment.trim()}
            >
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default QuickCommentEditor;