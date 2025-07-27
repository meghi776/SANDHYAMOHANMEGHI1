import React from 'react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  onReturnClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onReturnClick }) => {
  return (
    <footer className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-300 py-2 px-4 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div className="mb-4 md:mb-0">
          <p className="text-sm font-semibold">Meghi</p>
          <p className="text-xxs">&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
        <nav className="flex flex-wrap justify-center md:justify-end space-x-4 text-sm">
          <Button variant="link" className="hover:underline p-0 h-auto text-gray-800 dark:text-gray-300" onClick={onReturnClick}>
            Request a Return
          </Button>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;