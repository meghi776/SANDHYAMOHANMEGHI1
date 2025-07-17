import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 py-1 px-4 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div>
          <p className="text-xxs font-semibold">Meghi &copy; 2025 All rights reserved.</p>
        </div>
        <nav className="flex flex-wrap justify-center md:justify-end space-x-4 text-sm">
          {/* Removed navigation links as requested */}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;