'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModernSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'primary-foreground';
}

const sizes = {
  sm: { container: 'h-3.5 w-3.5', inner: 'inset-[2px]', dot: 'h-1 w-1' },
  md: { container: 'h-5 w-5', inner: 'inset-[3px]', dot: 'h-1.5 w-1.5' },
  lg: { container: 'h-6 w-6', inner: 'inset-[3px]', dot: 'h-1.5 w-1.5' },
};

const ModernSpinner = ({
  size = 'md',
  className,
  color = 'primary-foreground',
}: ModernSpinnerProps) => {
  const s = sizes[size];
  const borderColor =
    color === 'primary-foreground' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))';
  const borderFaded =
    color === 'primary-foreground' ? 'border-primary-foreground/20' : 'border-primary/20';
  const dotBg = color === 'primary-foreground' ? 'bg-primary-foreground' : 'bg-primary';

  return (
    <div className={cn('relative flex items-center justify-center', s.container, className)}>
      <motion.div
        className={cn('absolute inset-0 rounded-full border-2', borderFaded)}
        style={{ borderTopColor: borderColor }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className={cn('absolute rounded-full border-2 border-transparent', s.inner)}
        style={{ borderBottomColor: borderColor, borderLeftColor: borderColor }}
        animate={{ rotate: -360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className={cn('rounded-full', dotBg, s.dot)}
        animate={{ scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

export default ModernSpinner;
