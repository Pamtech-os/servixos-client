'use client';

import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUI } from '@/contexts/UIContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useUI();

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      className='absolute right-4 top-4 z-20 rounded-full border border-border bg-card/80 p-2.5 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:text-foreground'
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
    </motion.button>
  );
};

export default ThemeToggle;
