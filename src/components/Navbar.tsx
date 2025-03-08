
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, ShoppingBag, LayoutGrid, Lock, Heart, Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/deals?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-50 glass-effect shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-xl font-bold text-apple-darkGray hover:opacity-80 transition-opacity">
              <Target className="mr-2" size={24} />
              <span className="bg-gradient-to-r from-black to-apple-darkGray bg-clip-text text-transparent">Deals24</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center flex-1 mx-4">
            <form onSubmit={handleSearch} className="w-full max-w-md">
              <div className="relative">
                <Input
                  type="text" 
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:border-gray-300"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <button 
                  type="submit" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-apple-darkGray text-white p-1 rounded-full"
                >
                  <Search size={16} />
                </button>
              </div>
            </form>
          </div>
          
          {/* Desktop Action Items */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/deals" className="flex items-center text-xs font-medium text-apple-gray hover:text-apple-darkGray transition-all duration-300 hover:scale-105">
              <ShoppingBag className="mr-1.5" size={16} />
              Deals
            </Link>
            <Link to="/categories" className="flex items-center text-xs font-medium text-apple-gray hover:text-apple-darkGray transition-all duration-300 hover:scale-105">
              <LayoutGrid className="mr-1.5" size={16} />
              Categories
            </Link>
            <a 
              href="https://t.me/deals24com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-apple-gray hover:text-apple-darkGray transition-all duration-300 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 font-medium"
            >
              Join Telegram
            </a>
            <Link 
              to="/wishlist" 
              className="flex items-center text-xs text-apple-gray hover:text-apple-darkGray transition-all duration-300 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 font-medium"
            >
              <Heart className="mr-1.5" size={14} />
              Wishlist
            </Link>
            <Link 
              to="/admin" 
              className="flex items-center text-xs bg-gradient-to-r from-apple-darkGray to-black text-white px-4 py-1.5 rounded-full hover:shadow-md transition-all font-medium"
            >
              <Lock className="mr-1.5" size={14} />
              Admin
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md text-apple-darkGray hover:bg-gray-100"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-4 animate-fade-in">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Input
                type="text" 
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:border-gray-300"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-apple-darkGray text-white p-1 rounded-full"
              >
                <Search size={16} />
              </button>
            </div>
          </form>
          
          <div className="space-y-3">
            <Link 
              to="/deals" 
              className="flex items-center py-2 text-sm font-medium text-apple-gray hover:text-apple-darkGray"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingBag className="mr-2" size={16} />
              Deals
            </Link>
            <Link 
              to="/categories" 
              className="flex items-center py-2 text-sm font-medium text-apple-gray hover:text-apple-darkGray"
              onClick={() => setIsMenuOpen(false)}
            >
              <LayoutGrid className="mr-2" size={16} />
              Categories
            </Link>
            <Link 
              to="/wishlist" 
              className="flex items-center py-2 text-sm font-medium text-apple-gray hover:text-apple-darkGray"
              onClick={() => setIsMenuOpen(false)}
            >
              <Heart className="mr-2" size={16} />
              Wishlist
            </Link>
            <Link 
              to="/admin" 
              className="flex items-center py-2 text-sm font-medium text-apple-gray hover:text-apple-darkGray"
              onClick={() => setIsMenuOpen(false)}
            >
              <Lock className="mr-2" size={16} />
              Admin
            </Link>
            <a 
              href="https://t.me/deals24com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center py-2 text-sm font-medium text-apple-gray hover:text-apple-darkGray"
              onClick={() => setIsMenuOpen(false)}
            >
              Join Telegram
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
