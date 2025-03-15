
import React, { useState, useEffect } from 'react';
import { Heart, Search, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const popularSubCategories = [
    'Smart TV', '4K TV', 'Gaming Laptop', 'MacBook', 'iPhone', 'Samsung', 'LG',  
    'Washing Machine', 'Refrigerator', 'Air Conditioner', 'Headphones', 'TWS', 'T-shirt', 'Watch' , 'Ultrabook'
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/deals?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleSubCategoryClick = (subCategory: string) => {
    navigate(`/deals?search=${encodeURIComponent(subCategory)}`);
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-200 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white'}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-apple-darkGray md:text-2xl flex items-center gap-1">
              <span className="bg-gradient-to-r from-apple-darkGray to-black bg-clip-text text-transparent">Deals24</span>
            </Link>
          </div>

          <div className="hidden md:flex md:flex-1 md:justify-center md:px-4 lg:max-w-3xl relative">
            <Popover>
              <PopoverTrigger asChild className="w-full">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search for deals"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-100 px-4 py-2 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-apple-gray/20 transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray hover:text-apple-darkGray transition-colors"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-3 mt-1">
                <div className="text-sm font-medium text-apple-gray mb-2">Popular searches:</div>
                <div className="flex flex-wrap gap-2">
                  {popularSubCategories.map((subCat) => (
                    <button
                      key={subCat}
                      onClick={() => handleSubCategoryClick(subCat)}
                      className="bg-gray-100 hover:bg-gray-200 text-apple-gray text-xs px-3 py-1.5 rounded-full"
                    >
                      {subCat}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <Link to="/deals" className="px-4 py-2 rounded-md text-apple-gray hover:text-apple-darkGray transition-colors">
              All Deals
            </Link>
            <Link to="/categories" className="px-4 py-2 rounded-md text-apple-gray hover:text-apple-darkGray transition-colors">
              Categories
            </Link>
            <Link to="/wishlist" className="p-2 text-apple-gray hover:text-apple-darkGray transition-colors">
              <Heart size={20} />
            </Link>
            <Link to="/admin">
              <Button variant="outline" className="ml-2">
                Admin
              </Button>
            </Link>
          </nav>

          <div className="flex md:hidden items-center gap-3">
            <Link to="/wishlist" className="p-2 text-apple-gray hover:text-apple-darkGray transition-colors">
              <Heart size={20} />
            </Link>

            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-apple-gray">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <Link to="/" onClick={() => setIsMenuOpen(false)} className="font-semibold text-xl">
                        Deals24
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                        <X size={24} />
                      </Button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search for deals"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch(e);
                            setIsMenuOpen(false);
                          }
                        }}
                        className="w-full bg-gray-100 px-4 py-2 pr-10 rounded-full focus:outline-none"
                      />
                      <button
                        onClick={(e) => {
                          handleSearch(e);
                          setIsMenuOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    <nav className="flex flex-col space-y-4">
                      <Link
                        to="/"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-2 py-2 rounded-md hover:bg-gray-100"
                      >
                        Home
                      </Link>
                      <Link
                        to="/deals"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-2 py-2 rounded-md hover:bg-gray-100"
                      >
                        All Deals
                      </Link>
                      <Link
                        to="/categories"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-2 py-2 rounded-md hover:bg-gray-100"
                      >
                        Categories
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-2 py-2 rounded-md hover:bg-gray-100"
                      >
                        Saved Deals
                      </Link>
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-2 py-2 rounded-md hover:bg-gray-100"
                      >
                        Admin Dashboard
                      </Link>
                    </nav>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-gray-100 px-4 py-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for deals"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-100 px-4 py-2 pr-10 rounded-full focus:outline-none text-sm"
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray"
          >
            <Search size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
