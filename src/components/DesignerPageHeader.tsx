import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Share2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DesignerPageHeaderProps {
  onSave: () => void;
  onShare: () => void;
  onDownload: () => void;
}

const DesignerPageHeader: React.FC<DesignerPageHeaderProps> = ({ onSave, onShare, onDownload }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="sticky top-0 z-20 w-full bg-white dark:bg-gray-800 shadow-sm py-1 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      <Button variant="ghost" size="icon" onClick={handleBackClick} className="mr-4">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-grow text-center">
        Design Your Product
      </h1>
      <div className="flex items-center space-x-2 ml-4">
        <Button variant="ghost" size="icon" onClick={onSave}>
          <Save className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onShare}>Share Design</DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>Download Image</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default DesignerPageHeader;