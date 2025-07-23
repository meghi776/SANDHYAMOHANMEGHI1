import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer'; // Import the new Footer

const PublicLayout = () => {
  return (
    <div className="flex flex-col h-screen"> {/* Changed min-h-screen to h-screen and added flex-col */}
      <Header />
      <main className="flex-grow pt-1 overflow-y-auto"> {/* Added overflow-y-auto */}
        <Outlet />
      </main>
      <Footer /> {/* Add the Footer here */}
    </div>
  );
};

export default PublicLayout;