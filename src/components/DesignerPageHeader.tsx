import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, User, LogIn, Eye } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext';

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
}

const DesignerPageHeader: React.FC<DesignerPageHeaderProps> = ({ title, selectedElement, onDeleteElement }) => {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const { setIsDemoOrderModalOpen, setDemoOrderDetails } = useDemoOrderModal();

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleDeleteClick = () => {
    if (selectedElement) {
      onDeleteElement(selectedElement.id);
    }
  };

  const handlePreviewClick = () => {
    if (sessionLoading) {
      showError("Session is still loading. Please wait a moment.");
      return;
    }
    if (!user) {
      showError("Please log in to place a demo order.");
      navigate('/login');
      return;
    }
    setDemoOrderDetails('Demo User', '0.00', 'Preview Address'); 
    setIsDemoOrderModalOpen(true);
  };

  const showDeleteButton = selectedElement && selectedElement.type === 'image';

  const renderAuthButtons = () => {
    if (sessionLoading) {
      return <Button variant="ghost" disabled>Loading...</Button>;
    }

    if (user) {
      return (
        <>
          <Link to="/orders">
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              <User className="mr-1 h-4 w-4" />
              My Account
            </Button>
          </Link>
        </>
      );
    } else {
      return (
        <Link to="/login">
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <LogIn className="mr-1 h-4 w-4" />
            Login / Register
          </Button>
        </Link>
      );
    }
  };

  return (
    <div className="fixed top-0 w-full z-50 bg-white dark:bg-gray-800 shadow-sm py-2 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      <Button variant="ghost" size="icon" onClick={handleBackClick} className="mr-4 flex-shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-grow text-center truncate">
        {title}
      </h2>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {showDeleteButton && (
          <Button variant="destructive" size="icon" onClick={handleDeleteClick} title="Delete Selected Image">
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handlePreviewClick} className="flex-shrink-0">
          <Eye className="h-5 w-5" />
        </Button>
        {renderAuthButtons()}
      </div>
    </div>
  );
};

export default DesignerPageHeader;