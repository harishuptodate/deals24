
import React, { useState, useEffect, memo } from 'react';
import { Heart, ExternalLink, Trash2, PenSquare, Tag, Lock } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	handleTrackedLinkClick,
	updateMessageText,
	updateMessageCategory,
	getAllCategories,
} from '../services/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { 
	isAuthenticated, 
	hasEditPermission, 
	hasCategoryPermission, 
	grantEditPermission, 
	grantCategoryPermission, 
	verifyActionPassword 
} from '../services/authService';

interface DealCardProps {
	title: string;
	description: string;
	link: string;
	id?: string;
	category?: string;
	createdAt?: string;
	onDelete?: (id: string) => void;
	onEdit?: (id: string, newText: string) => void;
	onCategoryUpdate?: (id: string, category: string) => void;
	isAdmin?: boolean;
}

// Use memo to prevent unnecessary re-renders
const DealCard = memo(({
	title,
	description,
	link,
	id,
	category,
	createdAt,
	onDelete,
	onEdit,
	onCategoryUpdate,
	isAdmin = false,
}: DealCardProps) => {
	const { toast } = useToast();
	const [isFavorite, setIsFavorite] = useState(() => {
		const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
		return favorites.some((fav: any) => fav.title === title);
	});
	const [isOpen, setIsOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
	const [isEditPasswordDialogOpen, setIsEditPasswordDialogOpen] = useState(false);
	const [isCategoryPasswordDialogOpen, setIsCategoryPasswordDialogOpen] = useState(false);
	const [editedText, setEditedText] = useState(description);
	const [selectedCategory, setSelectedCategory] = useState(category || '');
	const [availableCategories, setAvailableCategories] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingCategories, setIsLoadingCategories] = useState(false);
	const [localTitle, setLocalTitle] = useState(title);
	const [localDescription, setLocalDescription] = useState(description);
	const [localCategory, setLocalCategory] = useState(category || '');
	const [deletePassword, setDeletePassword] = useState('');
	const [editPassword, setEditPassword] = useState('');
	const [categoryPassword, setCategoryPassword] = useState('');
	const [deleteError, setDeleteError] = useState('');
	const [editError, setEditError] = useState('');
	const [categoryError, setCategoryError] = useState('');
	const [currentActionType, setCurrentActionType] = useState<'edit' | 'category' | 'delete' | null>(null);
	
	// The deletion password should be set in an environment variable
	// For this implementation, I'll use a hardcoded password as a fallback
	const correctPassword = import.meta.env.VITE_DELETE_PASSWORD || 'admin123';

	useEffect(() => {
		if (isCategoryDialogOpen) {
			fetchCategories();
		}
	}, [isCategoryDialogOpen]);

	const fetchCategories = async () => {
		setIsLoadingCategories(true);
		try {
			const categories = await getAllCategories();
			setAvailableCategories(categories);
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to load categories',
				variant: 'destructive',
			});
		} finally {
			setIsLoadingCategories(false);
		}
	};

	const extractFirstLink = (text: string): string | null => {
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		const matches = text.match(urlRegex);
		return matches && matches.length > 0 ? matches[0] : null;
	};

	const extractLinks = (text: string) => {
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		return text.match(urlRegex) || [];
	};

	const links = extractLinks(description);
	const hasMultipleLinks = links.length > 1;

	const truncateLink = (url: string) => {
		try {
			const { hostname } = new URL(url);
			return hostname;
		} catch {
			return url;
		}
	};

	const toggleFavorite = (e: React.MouseEvent) => {
		e.stopPropagation();
		const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
		let newFavorites;

		if (isFavorite) {
			newFavorites = favorites.filter((fav: any) => fav.title !== title);
		} else {
			newFavorites = [
				...favorites,
				{
					title,
					description,
					link,
					id,
					timestamp: new Date().toISOString(),
				},
			];
		}

		localStorage.setItem('favorites', JSON.stringify(newFavorites));
		setIsFavorite(!isFavorite);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (id && onDelete) {
			// Open password dialog for deletion
			setCurrentActionType('delete');
			setDeletePassword('');
			setDeleteError('');
			setIsPasswordDialogOpen(true);
		}
	};

	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (id) {
			// Check if edit permission already granted
			if (hasEditPermission()) {
				setEditedText(description);
				setIsEditDialogOpen(true);
			} else {
				// Request password for edit permission
				setCurrentActionType('edit');
				setEditPassword('');
				setEditError('');
				setIsEditPasswordDialogOpen(true);
			}
		}
	};

	const handleOpenCategoryDialog = (e: React.MouseEvent) => {
		e.stopPropagation();
		// Check if category permission already granted
		if (hasCategoryPermission()) {
			setSelectedCategory(category || '');
			setIsCategoryDialogOpen(true);
		} else {
			// Request password for category permission
			setCurrentActionType('category');
			setCategoryPassword('');
			setCategoryError('');
			setIsCategoryPasswordDialogOpen(true);
		}
	};

	const confirmDelete = () => {
		if (id && onDelete) {
			onDelete(id);
			setIsDeleteDialogOpen(false);
			setIsOpen(false);
		}
	};
	
	const handlePasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (deletePassword !== correctPassword) {
			setDeleteError('Incorrect password. Please try again.');
			return;
		}
		
		setIsPasswordDialogOpen(false);
		setIsDeleteDialogOpen(true);
	};

	const handleEditPasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!verifyActionPassword(editPassword)) {
			setEditError('Incorrect password. Please try again.');
			return;
		}
		
		// Grant edit permission for this session
		grantEditPermission();
		setIsEditPasswordDialogOpen(false);
		
		// Open edit dialog
		setEditedText(description);
		setIsEditDialogOpen(true);
	};

	const handleCategoryPasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!verifyActionPassword(categoryPassword)) {
			setCategoryError('Incorrect password. Please try again.');
			return;
		}
		
		// Grant category permission for this session
		grantCategoryPermission();
		setIsCategoryPasswordDialogOpen(false);
		
		// Open category dialog
		setSelectedCategory(category || '');
		setIsCategoryDialogOpen(true);
	};

	const handleSaveEdit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!id) return;

		setIsSubmitting(true);

		try {
			const success = await updateMessageText(id, editedText);
			if (success) {
				setLocalDescription(editedText);
				setLocalTitle(editedText.split('\n')[0] || 'New Deal');

				toast({
					title: 'Success',
					description: 'Deal was updated successfully',
				});
				setIsEditDialogOpen(false);

				if (onEdit) {
					onEdit(id, editedText);
				}
			} else {
				toast({
					title: 'Error',
					description: 'Failed to update deal',
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An error occurred while updating the deal',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveCategory = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!id) return;

		setIsSubmitting(true);

		try {
			const success = await updateMessageCategory(id, selectedCategory);
			if (success) {
				setLocalCategory(selectedCategory);

				toast({
					title: 'Success',
					description: 'Category was updated successfully',
				});
				setIsCategoryDialogOpen(false);

				if (onCategoryUpdate) {
					onCategoryUpdate(id, selectedCategory);
				}
			} else {
				toast({
					title: 'Error',
					description: 'Failed to update category',
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An error occurred while updating the category',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const makeLinksClickable = (text: string) => {
		if (!text) return '';

		const urlRegex = /(https?:\/\/[^\s]+)/g;
		const parts = text.split(urlRegex);

		return parts.map((part, index) => {
			if (part.match(urlRegex)) {
				return (
					<a
						key={`link-${index}-${part.substring(0, 10)}`}
						href={part}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => {
							handleTrackedLinkClick(part, id, e.nativeEvent);

							if (e.ctrlKey || e.metaKey || e.button === 1) return;

							e.preventDefault();
							e.stopPropagation();

							setTimeout(() => {
								window.open(part, '_blank');
							}, 100);
						}}
						className="text-blue-600 hover:underline break-all inline-flex items-center gap-1">
						{truncateLink(part)}
						<ExternalLink size={12} />
					</a>
				);
			}
			return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
		});
	};

	const formattedDate = createdAt
		? format(new Date(createdAt), 'MMM d, h:mm a')
		: '';

	const displayTitle = localTitle || title;
	const displayDescription = localDescription || description;
	const displayCategory = localCategory || category;

	return (
		<>
			<div
				className="group animate-fade-up hover-scale cursor-pointer h-[290px]"
				onClick={(e) => {
					if (e.ctrlKey || e.metaKey || e.button === 1) return;
					setIsOpen(true);
				}}>
				<div className="relative glass-effect rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col border-gray-200 dark:border-gray-900  dark:bg-zinc-950 ">
					<div className="absolute top-4 right-4 flex gap-1 z-10">
						{onDelete &&  (
							<>
								<button
									onClick={handleOpenCategoryDialog}
									className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									title="Change category">
									<Tag className="w-5 h-5 text-purple-500" />
								</button>
								<button
									onClick={handleEdit}
									className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800  transition-colors"
									title="Edit deal">
									<PenSquare className="w-5 h-5 text-blue-500" />
								</button>
								<button
									onClick={handleDelete}
									className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									title="Delete deal">
									<Trash2 className="w-5 h-5 text-red-500" />
								</button>
							</>
						)}
						<button
							onClick={toggleFavorite}
							className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
							<Heart
								className={`w-5 h-5 transition-colors ${
									isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
								}`}
							/>
						</button>
					</div>

					<div className="space-y-2 flex-1 flex flex-col">
						<div className="space-y-1">
							{formattedDate && (
								<span className="inline-block px-2 py-1 text-xs font-medium bg-gradient-to-r dark:to-gray-500 rounded-full text-apple-gray shadow-md">
									{formattedDate}
								</span>
							)}
							<h3 className="text-lg font-semibold text-apple-darkGray line-clamp-2">
								{displayTitle}
							</h3>
						</div>

						<div className="mt-1">
							<p className="text-sm text-apple-gray line-clamp-5 flex-grow">
								{displayDescription}
							</p>
						</div>

						<div className="mt-auto pt-2">
							{hasMultipleLinks ? (
								<Button
									onClick={(e) => {
										e.stopPropagation();
										setIsOpen(true);
									}}
									className="w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20">
									View Deal Details
								</Button>
							) : (
								<a
									href={link || extractFirstLink(description) || '#'}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => {
										handleTrackedLinkClick(
											link || extractFirstLink(description) || '',
											id,
											e.nativeEvent,
										);

										if (e.ctrlKey || e.metaKey || e.button === 1) return;

										e.preventDefault();
										e.stopPropagation();

										setTimeout(() => {
											window.open(
												link || extractFirstLink(description) || '',
												'_blank',
											);
										}, 100);
									}}
									className="inline-block w-full text-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20">
									Buy Now
								</a>
							)}
						</div>
					</div>
				</div>
			</div>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="text-xl">{displayTitle}</DialogTitle>
					</DialogHeader>

					<div className="mt-4 text-sm whitespace-pre-line">
						{makeLinksClickable(displayDescription)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Password Dialog for Delete Protection */}
			<Dialog 
				open={isPasswordDialogOpen} 
				onOpenChange={setIsPasswordDialogOpen}
			>
				<DialogContent className="sm:max-w-[400px] max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-red-500" /> 
							Authentication Required
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handlePasswordSubmit}>
						<div className="mt-4 space-y-4">
							<p className="text-sm">
								Please enter the admin password to proceed with deletion:
							</p>
							
							<Input
								type="password"
								value={deletePassword}
								onChange={(e) => {
									setDeletePassword(e.target.value);
									setDeleteError('');
								}}
								placeholder="Enter password"
							/>
							
							{deleteError && (
								<p className="text-sm text-red-500">{deleteError}</p>
							)}
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsPasswordDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!deletePassword.trim()}
								variant="destructive">
								Verify
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Password Dialog for Edit Protection */}
			<Dialog 
				open={isEditPasswordDialogOpen} 
				onOpenChange={setIsEditPasswordDialogOpen}
			>
				<DialogContent className="sm:max-w-[400px] max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-blue-500" /> 
							Authentication Required
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleEditPasswordSubmit}>
						<div className="mt-4 space-y-4">
							<p className="text-sm">
								Please enter the admin password to edit deals:
							</p>
							
							<Input
								type="password"
								value={editPassword}
								onChange={(e) => {
									setEditPassword(e.target.value);
									setEditError('');
								}}
								placeholder="Enter password"
							/>
							
							{editError && (
								<p className="text-sm text-red-500">{editError}</p>
							)}
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditPasswordDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!editPassword.trim()}>
								Verify
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Password Dialog for Category Protection */}
			<Dialog 
				open={isCategoryPasswordDialogOpen} 
				onOpenChange={setIsCategoryPasswordDialogOpen}
			>
				<DialogContent className="sm:max-w-[400px] max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-purple-500" /> 
							Authentication Required
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleCategoryPasswordSubmit}>
						<div className="mt-4 space-y-4">
							<p className="text-sm">
								Please enter the admin password to change categories:
							</p>
							
							<Input
								type="password"
								value={categoryPassword}
								onChange={(e) => {
									setCategoryPassword(e.target.value);
									setCategoryError('');
								}}
								placeholder="Enter password"
							/>
							
							{categoryError && (
								<p className="text-sm text-red-500">{categoryError}</p>
							)}
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCategoryPasswordDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!categoryPassword.trim()}>
								Verify
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this deal. This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-red-500 hover:bg-red-600">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle>Edit Deal</DialogTitle>
					</DialogHeader>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSaveEdit();
						}}>
						<div className="mt-4">
							<Textarea
								value={editedText}
								onChange={(e) => setEditedText(e.target.value)}
								placeholder="Deal description"
								className="min-h-[200px]"
							/>
						</div>

						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || !editedText.trim()}>
								{isSubmitting ? 'Saving...' : 'Save Changes'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={isCategoryDialogOpen}
				onOpenChange={setIsCategoryDialogOpen}>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle>Change Category</DialogTitle>
					</DialogHeader>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSaveCategory();
						}}>
						<div className="mt-4">
							<Select
								value={selectedCategory}
								onValueChange={setSelectedCategory}
								disabled={isLoadingCategories}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a category" />
								</SelectTrigger>
								<SelectContent>
									{isLoadingCategories ? (
										<SelectItem value="loading" disabled>
											Loading categories...
										</SelectItem>
									) : (
										availableCategories.map((cat) => (
											<SelectItem key={cat} value={cat}>
												{cat}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCategoryDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || !selectedCategory.trim()}>
								{isSubmitting ? 'Saving...' : 'Save Category'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
});
  
export default DealCard;
