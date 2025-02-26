
import React from 'react';
import { Button } from '@/components/ui/button';

const categories = [
  'Electronics',
  'Laptops',
  'Mobile Phones',
  'Home Appliances',
];

const CategorySection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-semibold text-apple-darkGray mb-8">Popular Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Button
              key={category}
              variant="outline"
              className="w-full rounded-xl h-24 text-lg font-medium hover:bg-apple-lightGray"
              asChild
            >
              <a href={`/category/${category.toLowerCase().replace(' ', '-')}`}>
                {category}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
