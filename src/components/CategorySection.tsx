
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tv, Laptop, Smartphone, Shirt } from 'lucide-react';

const categories = [
  { name: 'Electronics & Home', slug: 'electronics-home', icon: <Tv size={20} className="mr-2" /> },
  { name: 'Laptops', slug: 'laptops', icon: <Laptop size={20} className="mr-2" /> },
  { name: 'Mobile Phones', slug: 'mobile-phones', icon: <Smartphone size={20} className="mr-2" /> },
  { name: 'Fashion', slug: 'fashion', icon: <Shirt size={20} className="mr-2" /> },
];

const CategorySection = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (slug: string) => {
    navigate(`/deals?category=${slug}`);
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-semibold text-gradient mb-8">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Button
              key={category.name}
              variant="outline"
              className="w-full rounded-xl h-24 text-lg font-medium glass-effect hover:bg-white/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
              onClick={() => handleCategoryClick(category.slug)}
            >
              <div className="flex items-center text-apple-gray group-hover:text-apple-darkGray transition-colors">
                {category.icon}
                <span>{category.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
