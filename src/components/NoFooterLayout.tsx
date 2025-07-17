import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const NoFooterLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-1">
        <Outlet />
      </main>
    </div>
  );
};

export default NoFooterLayout;