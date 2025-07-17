import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 px-4 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div className="mb-4 md:mb-0">
          <p className="text-lg font-semibold">Meghi</p>
          <p className="text-sm">&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
        <nav className="flex flex-wrap justify-center md:justify-end space-x-4 text-sm">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
          <Link to="/cancellation-refund" className="hover:text-white transition-colors">Cancellation & Refund</Link>
          <Link to="/shipping-delivery" className="hover:text-white transition-colors">Shipping & Delivery</Link>
          <Link to="/contact-us" className="hover:text-white transition-colors">Contact Us</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;