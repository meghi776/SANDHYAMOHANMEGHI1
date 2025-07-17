import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, User, LogIn } from 'lucide-react'; // Import User and LogIn icons
import { useSession } from '@/contexts/SessionContext'; // Import useSession
import { showError } from '@/utils/toast'; // Import showError

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
  const { user, loading: sessionLoading } = useSession(); // Use useSession hook

  const handleBackClick = () => {
    navigate(-1); // Go back to the previous page in history
  };

  const handleDeleteClick = () => {
    if (selectedElement) {
      onDeleteElement(selectedElement.id);
    }
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
            <Button variant="ghost" size="sm">
              <User className="mr-1 h-4 w-4" />
              My Account
            </Button>
          </Link>
          {/* Optionally add admin button if user is admin and you want it here */}
          {/* {user.user_metadata?.role === 'admin' && (
            <Link to="/admin">
              <Button variant="ghost" size="sm">Admin</Button>
            </Link>
          )} */}
        </>
      );
    } else {
      return (
        <Link to="/login">
          <Button variant="ghost" size="sm">
            <LogIn className="mr-1 h-4 w-4" />
            Login / Register
          </Button>
        </Link>
      );
    }
  };

  return (
    <div className="sticky top-0 z-20 w-full bg-white dark:bg-gray-800 shadow-sm py-2 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      <Button variant="ghost" size="icon" onClick={handleBackClick} className="mr-4">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex-grow text-center">
        {title}
      </h2>
      <div className="flex items-center space-x-2">
        {showDeleteButton && (
          <Button variant="destructive" size="icon" onClick={handleDeleteClick} title="Delete Selected Image">
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
        {renderAuthButtons()}
      </div>
    </div>
  );
};

export default DesignerPageHeader;