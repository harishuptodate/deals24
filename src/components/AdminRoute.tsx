import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLoginDialog } from '@/components/AdminLoginDialog';
import Navbar from '@/components/Navbar';
import {
	ADMIN_AUTH_CHANGE_EVENT,
	isAuthenticated,
} from '@/services/authService';

interface AdminRouteProps {
	children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
	const navigate = useNavigate();
	const [isAdmin, setIsAdmin] = useState(() => isAuthenticated());

	useEffect(() => {
		const syncAdminSession = () => setIsAdmin(isAuthenticated());
		window.addEventListener(ADMIN_AUTH_CHANGE_EVENT, syncAdminSession);
		window.addEventListener('storage', syncAdminSession);

		return () => {
			window.removeEventListener(ADMIN_AUTH_CHANGE_EVENT, syncAdminSession);
			window.removeEventListener('storage', syncAdminSession);
		};
	}, []);

	if (isAdmin) {
		return children;
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#09090B]">
			<Navbar />
			<AdminLoginDialog
				isOpen
				onClose={() => navigate('/', { replace: true })}
				onSuccess={() => setIsAdmin(true)}
			/>
		</div>
	);
}
