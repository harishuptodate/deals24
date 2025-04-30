import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tv, Laptop, Smartphone, Shirt, Headphones } from 'lucide-react';
import { getCategoryCounts } from '../services/api';
import { CategoryCount } from '../types/telegram';

const CategorySection = () => {
	const navigate = useNavigate();
	const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
		{},
	);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchCategoryCounts = async () => {
			try {
				const counts = await getCategoryCounts();
				if (counts && Array.isArray(counts)) {
					const countMap: Record<string, number> = {};
					counts.forEach((item: CategoryCount) => {
						if (item && item.category) {
							countMap[item.category] = item.count;
						}
					});
					console.log('Category counts fetched:', countMap); // Debug output
					setCategoryCounts(countMap);
				} else {
					console.error('Invalid counts data format:', counts);
					setDefaultCategoryCounts();
				}
			} catch (error) {
				console.error('Failed to fetch category counts:', error);
				setDefaultCategoryCounts();
			} finally {
				setIsLoading(false);
			}
		};

		const setDefaultCategoryCounts = () => {
			setCategoryCounts({
				'electronics-home': 245,
				laptops: 85,
				'mobile-phones': 120,
				'gadgets-accessories': 175,
				fashion: 95,
			});
		};

		fetchCategoryCounts();
	}, []);

	const getCount = (categorySlug: string) => {
		return categoryCounts[categorySlug] || 0;
	};

	const categories = [
		{
			name: 'Best Deals',
			slug: 'Best-Deals',
			icon: <Tv size={20} className="mr-2" />,
		},
		{
			name: 'Electronics & Home',
			slug: 'electronics-home',
			icon: <Tv size={20} className="mr-2" />,
		},
		{
			name: 'Laptops',
			slug: 'laptops',
			icon: <Laptop size={20} className="mr-2" />,
		},
		{
			name: 'Mobile Phones',
			slug: 'mobile-phones',
			icon: <Smartphone size={20} className="mr-2" />,
		},
		{
			name: 'Gadgets & Accessories',
			slug: 'gadgets-accessories',
			icon: <Headphones size={20} className="mr-2" />,
		},
		{
			name: 'Fashion',
			slug: 'fashion',
			icon: <Shirt size={20} className="mr-2" />,
		},
	];

	const handleCategoryClick = (slug: string) => {
		navigate(`/deals?category=${slug}`);
	};

	return (
		<section className="py-16 bg-white">
			<div className="container mx-auto px-4">
				<h2 className="text-2xl font-semibold text-gradient mb-8">
					Popular Categories
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
					{categories.map((category) => (
						<Button
							key={category.name}
							variant="outline"
							className="w-full rounded-xl h-24 text-lg font-medium glass-effect hover:bg-white/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group flex flex-col items-center justify-center gap-1"
							onClick={() => handleCategoryClick(category.slug)}>
							<div className="flex items-center text-apple-gray group-hover:text-apple-darkGray transition-colors mb-1">
								{category.icon}
								<span>{category.name}</span>
							</div>
							<span className="text-xs font-normal text-apple-gray">
								{getCount(category.slug)} deals
							</span>
						</Button>
					))}
				</div>
			</div>
		</section>
	);
};

export default CategorySection;
