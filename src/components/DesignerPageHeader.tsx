import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react'; // Removed Share2 icon

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textShadow?: boolean;
  rotation?: number;
}

interface DesignerPageHeaderProps {
  title: string;
  selectedElement: DesignElement | null;
  onDeleteElement: (id: string) => void;
  // Removed onShareDesign prop
}

const DesignerPageHeader: React.FC<DesignerPageHeaderProps> = ({ title, selectedElement, onDeleteElement }) => { // Removed onShareDesign from destructuring
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1); // Go back to the previous page in history
  };

  const handleDeleteClick = () => {
    if (selectedElement) {
      onDeleteElement(selectedElement.id);
    }
  };

  const showDeleteButton = selectedElement && selectedElement.type === 'image';

  return (
    <div className="sticky top-0 z-20 w-full bg-white dark:bg-gray-800 shadow-sm py-2 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      <Button variant="ghost" size="icon" onClick={handleBackClick} className="mr-4">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex-grow text-center">
        {title}
      </h2>
      <div className="flex items-center space-x-2">
        {/* Removed Share2 button */}
        {showDeleteButton && (
          <Button variant="destructive" size="icon" onClick={handleDeleteClick} title="Delete Selected Image">
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
        {/* Spacer to balance the layout if delete button is not shown */}
        {!showDeleteButton && <div className="w-10"></div>} 
      </div>
    </div>
  );
};

export default DesignerPageHeader;