
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-semibold text-apple-darkGray">
            Deals24
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/deals" className="text-apple-gray hover:text-apple-darkGray transition-colors">
              Deals
            </Link>
            <Link to="/categories" className="text-apple-gray hover:text-apple-darkGray transition-colors">
              Categories
            </Link>
            <Link to="/admin" className="text-apple-gray hover:text-apple-darkGray transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
