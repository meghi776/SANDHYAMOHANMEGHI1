import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer'; // Import the Footer

const CustomizerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* No Header component here */}
      <main className="flex-grow pt-1">
        <Outlet />
      </main>
      <Footer /> {/* Include the Footer */}
    </div>
  );
};

export default CustomizerLayout;