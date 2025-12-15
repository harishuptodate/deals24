import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Cover } from '@/components/ui/cover';

const HeroSection = () => {
	const staggerContainer = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				delayChildren: 0.2,
				staggerChildren: 0.15,
			},
		},
	};

	const staggerItem = {
		hidden: { opacity: 0, y: 30 },
		visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
	};

	return (
		<motion.section
			className="relative py-10 md:py-14 overflow-hidden bg-gradient-to-b from-apple-lightGray to-white dark:from-[#09090B] dark:to-[#09090B] flex items-center justify-center flex-col"
			variants={staggerContainer}
			initial="hidden"
			animate="visible">
			<motion.div
				className="container px-4 max-w-4xl text-center space-y-4 md:space-y-6"
				variants={staggerItem}>
				<span className="relative inline-block text-sm font-medium leading-6 text-white rounded-full p-px shadow-2xl shadow-zinc-900">
					<span className="absolute inset-0 overflow-hidden rounded-full">
						<span className="absolute inset-0 rounded-full bg-[radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-100" />
						{/* Orbiting dot around the badge */}
						<span className="absolute -inset-px rounded-[inherit] pointer-events-none">
							<motion.div
								className="absolute aspect-square bg-gradient-to-r from-transparent via-amber-500 to-amber-700 dark:via-amber-200 dark:to-amber-400"
								animate={{ offsetDistance: ['0%', '100%'] }}
								style={{
									width: 12,
									offsetPath: `rect(0 auto auto 0 round 16px)`,
								}}
								transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
							/>
						</span>
					</span>
					<span className="relative z-10 flex items-center space-x-2 rounded-full bg-zinc-950 py-1 px-5 ring-1 ring-white/10">
						<span>✨ Welcome to Deals24</span>
					</span>
				</span>

				<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
					<motion.span
						className="block text-xl md:text-2xl lg:text-3xl mb-1 text-gradient dark:text-gradient"
						variants={staggerItem}>
						Your one-stop destination for
					</motion.span>
					<motion.span
						className="text-gradient dark:text-gradient"
						variants={staggerItem}>
						<Cover>
							<span className="dark:text-neutral-100">
								deals, discounts, and offers
							</span>
						</Cover>
					</motion.span>
				</h1>

				{/* <motion.div
					className="flex flex-wrap items-center justify-center gap-4 mt-4"
					variants={staggerItem}>
					<Button
						variant="default"
						size="lg"
						className="bg-gradient-to-r from-gray-700 to-black text-white dark:from-gray-700 dark:to-black rounded-full shadow-lg shadow-apple-darkGray/20 hover:shadow-xl hover:shadow-apple-darkGray/30 transition-all duration-300 text-sm md:text-base px-4 py-2 h-auto  active:scale-95 ease-in-out"
						asChild>
						<a
							href="https://t.me/deals24com"
							target="_blank"
							rel="noopener noreferrer">
							Join Our Telegram
						</a>
					</Button>
					<Button
						variant="outline"
						size="lg"
						className="rounded-full glass-effect dark:bg-gray-800/50 hover:bg-white/50 dark:hover:bg-gray-700/60 transition-all duration-300 text-sm md:text-base px-4 py-2 h-auto text-apple-darkGray dark:text-white dark:border-gray-700  active:scale-95 ease-in-out"
						asChild>
						<a href="/categories">Browse Categories</a>
					</Button>
				</motion.div> */}
			</motion.div>

			{/* Decorative gradients */}
			<div className="absolute inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 dark:to-black/40" />
				<div className="absolute top-0 left-1/4 w-48 md:w-64 h-48 md:h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full filter blur-3xl" />
				<div className="absolute bottom-0 right-1/4 w-48 md:w-64 h-48 md:h-64 bg-gradient-to-r from-pink-500/10 to-orange-500/10 dark:from-pink-500/5 dark:to-orange-500/5 rounded-full filter blur-3xl" />
			</div>
		</motion.section>
	);
};

export default HeroSection;
