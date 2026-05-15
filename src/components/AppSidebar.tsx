'use client';

import { memo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  ScrollText,
  MessageSquare,
  Contact,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import servixLogo from '@/assets/servix-logo.png';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Files', href: '/files', icon: FolderOpen },
  { label: 'Contracts', href: '/contracts', icon: ScrollText },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Contacts', href: '/contacts', icon: Contact },
] as const;

interface SidebarLogoProps {
  compact?: boolean;
}

const SidebarLogo = memo(({ compact = false }: SidebarLogoProps) => (
  <div className={compact ? 'flex min-w-0 items-center gap-2' : 'flex items-center gap-2 px-4 py-5'}>
    <Image
      src={servixLogo}
      alt='Client Portal'
      className={compact ? 'h-7 w-7 shrink-0' : 'h-8 w-8 shrink-0'}
      priority
    />
    <span
      className={`font-display font-bold ${
        compact ? 'max-w-[7.5rem] truncate text-sm sm:max-w-none sm:text-base' : 'text-lg'
      }`}
    >
      Client Portal
    </span>
  </div>
));
SidebarLogo.displayName = 'SidebarLogo';

const AppSidebar = () => {
  const pathname = usePathname();
  const currentPathname = pathname ?? '';
  const router = useRouter();
  const { logout } = useAuth();
  const { isDarkMode, toggleTheme, mobileSidebarOpen, setMobileSidebarOpen } = useUI();

  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const navContent = (
    <div className='flex h-full flex-col'>
      <SidebarLogo />
      <nav className='flex-1 space-y-1 overflow-y-auto px-3 py-4'>
        {navItems.map((item) => {
          const isActive =
            currentPathname === item.href || currentPathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className='space-y-1 border-t border-border px-3 py-4'>
        <button
          onClick={toggleTheme}
          className='flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={() => void handleLogout()}
          className='flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-destructive/10'
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className='fixed left-0 top-0 z-40 hidden h-screen w-60 border-r border-border bg-card lg:block'>
        {navContent}
      </aside>

      <div className='fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden'>
        <SidebarLogo compact />
        <button
          onClick={() => setMobileSidebarOpen((prev) => !prev)}
          className='shrink-0 rounded-lg p-2 text-foreground'
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-50 bg-background/60 backdrop-blur-sm lg:hidden'
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className='fixed left-0 top-0 z-50 h-screen w-60 border-r border-border bg-card lg:hidden'
            >
              {navContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppSidebar;
