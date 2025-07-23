import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Trash2 } from 'lucide-react'; // Removed Eye, User, LogIn
import { DesignElement } from '@/hooks/useCustomizerState'; // Import DesignElement

interface DesignerPageHeaderProps {
  title: string;
  selectedElement: DesignElement | null;
  onDeleteElement: (id: string) => void;
}

const DesignerPageHeader: React.FC<DesignerPageHeaderProps> = ({ title, selectedElement, onDeleteElement }) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleDeleteClick = () => {
    if (selectedElement) {
      onDeleteElement(selectedElement.id);
    }
  };

  const showDeleteButton = selectedElement && selectedElement.type === 'image';

  return (
    <div className="fixed top-0 w-full z-50 h-14 flex items-center justify-between py-2 px-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <Button variant="ghost" size="icon" onClick={handleBackClick} className="flex-shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[calc(100%-120px)] text-center">
        {title}
      </h1>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {showDeleteButton && (
          <Button variant="destructive" size="icon" onClick={handleDeleteClick} title="Delete Selected Image">
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="flex-shrink-0">
          <Check className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default DesignerPageHeader;