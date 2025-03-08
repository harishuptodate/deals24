
import React from 'react';
import { Link } from 'react-router-dom';
import { Target, ShoppingBag, LayoutGrid, Lock, Heart } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 glass-effect shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-xl font-bold text-apple-darkGray hover:opacity-80 transition-opacity">
              <Target className="mr-2" size={24} />
              <span className="bg-gradient-to-r from-black to-apple-darkGray bg-clip-text text-transparent">Deals24</span>
            </Link>
            
            <div className="hidden md:flex items-center ml-10 space-x-8">
              <Link to="/deals" className="flex items-center font-medium text-apple-gray hover:text-apple-darkGray transition-all duration-300 hover:scale-105">
                <ShoppingBag className="mr-1.5" size={18} />
                Deals
              </Link>
              <Link to="/categories" className="flex items-center font-medium text-apple-gray hover:text-apple-darkGray transition-all duration-300 hover:scale-105">
                <LayoutGrid className="mr-1.5" size={18} />
                Categories
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="https://t.me/deals24com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-apple-gray hover:text-apple-darkGray transition-all duration-300 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 font-medium"
            >
              Join Telegram
            </a>
            <Link 
              to="/wishlist" 
              className="flex items-center text-apple-gray hover:text-apple-darkGray transition-all duration-300 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 font-medium"
            >
              <Heart className="mr-1.5" size={16} />
              Wishlist
            </Link>
            <Link 
              to="/admin" 
              className="flex items-center bg-gradient-to-r from-apple-darkGray to-black text-white px-4 py-1.5 rounded-full hover:shadow-md transition-all font-medium"
            >
              <Lock className="mr-1.5" size={16} />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
