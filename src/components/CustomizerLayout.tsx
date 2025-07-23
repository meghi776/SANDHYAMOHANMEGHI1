import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from './Footer'; // Import the Footer

const CustomizerLayout = () => {
  return (
    <div className="flex flex-col h-screen"> {/* Changed min-h-screen to h-screen and added flex-col */}
      {/* No Header component here */}
      <main className="flex-grow pt-0 overflow-y-auto"> {/* Removed pt-1 */}
        <Outlet />
      </main>
      <Footer /> {/* Include the Footer */}
    </div>
  );
};

export default CustomizerLayout;