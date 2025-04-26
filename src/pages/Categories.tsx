import React from 'react';
import Navbar from '../components/Navbar';
import { Tag, Laptop, Smartphone, Tv, Shirt, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategoryCounts } from '../services/api';
import { Loader2 } from 'lucide-react';
import { BigFooter } from '@/components/BigFooter';

const Categories = () => {
	const navigate = useNavigate();

	// Fetch category counts using react-query
	const {
		data: categoryCountsData,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['category-counts'],
		queryFn: getCategoryCounts,
	});

	// Prepare a simple map for easy lookup
	const countMap: Record<string, number> = {};
	if (categoryCountsData) {
		categoryCountsData.forEach((item) => {
			countMap[item.category] = item.count;
		});
	}

	const getCount = (categorySlug: string) => {
		return countMap[categorySlug] || 0;
	};

	const categories = [
		{
			name: 'Electronics & Home',
			count: getCount('electronics-home'),
			icon: <Tv className="w-12 h-12 mb-4 text-gray-700 dark:text-gray-300" />,
			description:
				'Find the latest deals on TVs, appliances, audio systems and more',
			slug: 'electronics-home',
		},
		{
			name: 'Laptops & PCs',
			count: getCount('laptops'),
			icon: (
				<Laptop className="w-12 h-12 mb-4 text-gray-700 dark:text-gray-300" />
			),
			description: 'Gaming laptops, ultrabooks, and productivity machines',
			slug: 'laptops',
		},
		{
			name: 'Mobile Phones',
			count: getCount('mobile-phones'),
			icon: (
				<Smartphone className="w-12 h-12 mb-4 text-gray-700 dark:text-gray-300" />
			),
			description: 'Smartphones, accessories, and wearable devices',
			slug: 'mobile-phones',
		},
		{
			name: 'Gadgets & Accessories',
			count: getCount('gadgets-accessories'),
			icon: (
				<Headphones className="w-12 h-12 mb-4 text-gray-700 dark:text-gray-300" />
			),
			description:
				'Headphones, chargers, power banks, and other tech accessories',
			slug: 'gadgets-accessories',
		},
		{
			name: 'Fashion',
			count: getCount('fashion'),
			icon: (
				<Shirt className="w-12 h-12 mb-4 text-gray-700 dark:text-gray-300" />
			),
			description: 'Clothing, shoes, watches and accessories for all',
			slug: 'fashion',
		},
	];

	const handleCategoryClick = (slug: string) => {
		navigate(`/deals?category=${slug}`);
	};

	const handleSubCategoryClick = (subcategory: string) => {
		navigate(`/deals?search=${encodeURIComponent(subcategory)}`);
	};

	const popularSubCategories = [
		'Smart TV',
		'4K TV',
		'Gaming Laptop',
		'MacBook',
		'iPhone',
		'Samsung',
		'LG',
		'Washing Machine',
		'Refrigerator',
		'Air Conditioner',
		'Headphones',
		'TWS',
		'T-shirt',
		'Watch',
		'Ultrabook',
	];

	return (
		<div className="min-h-screen bg-white dark:bg-[#09090B] text-apple-darkGray dark:text-gray-200">
			<Navbar />
			<main className="container mx-auto px-4 py-12">
				<h1 className="text-3xl font-bold text-gradient mb-8">
					Browse by Category
				</h1>

				{isLoading ? (
					<div className="flex justify-center items-center h-64">
						<Loader2 className="w-8 h-8 animate-spin text-apple-gray dark:text-gray-400" />
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{categories.map((category) => (
							<a
								onClick={() => handleCategoryClick(category.slug)}
								key={category.name}
								className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-900 rounded-xl p-6 text-center transition-all hover:shadow-md dark:hover:shadow-gray-900 hover:-translate-y-1 flex flex-col items-center cursor-pointer">
								{category.icon}
								<h3 className="text-xl font-semibold text-apple-darkGray dark:text-white mb-2">
									{category.name}
								</h3>
								<p className="text-apple-gray dark:text-gray-400 text-sm mb-4">
									{category.description}
								</p>
								<span className="bg-gray-100 dark:bg-apple-darkGray px-4 py-2 rounded-full text-sm text-apple-darkGray dark:text-gray-300 transition-colors">
									{category.count} deals
								</span>
							</a>
						))}
					</div>
				)}

				<div className="mt-16">
					<h2 className="text-2xl font-semibold text-gradient mb-6">
						Popular Sub-categories
					</h2>
					<div className="flex flex-wrap gap-3">
						{popularSubCategories.map((tag) => (
							<a
								onClick={() => handleSubCategoryClick(tag)}
								key={tag}
								className="bg-gray-100 dark:bg-apple-darkGray hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-full text-sm text-apple-darkGray dark:text-gray-300 transition-colors cursor-pointer">
								{tag}
							</a>
						))}
					</div>
				</div>
			</main>
			<BigFooter />
		</div>
	);
};

export default Categories;
