import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer'; // Import the new Footer
import ReturnRequestModal from './ReturnRequestModal';

const PublicLayout = () => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-1">
        <Outlet />
      </main>
      <Footer onReturnClick={() => setIsReturnModalOpen(true)} />
      <ReturnRequestModal isOpen={isReturnModalOpen} onOpenChange={setIsReturnModalOpen} />
    </div>
  );
};

export default PublicLayout;