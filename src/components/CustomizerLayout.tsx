import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer'; // Import the Footer
import ReturnRequestModal from './ReturnRequestModal';

const CustomizerLayout = () => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* No Header component here */}
      <main className="flex-grow pt-1">
        <Outlet />
      </main>
      <Footer onReturnClick={() => setIsReturnModalOpen(true)} />
      <ReturnRequestModal isOpen={isReturnModalOpen} onOpenChange={setIsReturnModalOpen} />
    </div>
  );
};

export default CustomizerLayout;