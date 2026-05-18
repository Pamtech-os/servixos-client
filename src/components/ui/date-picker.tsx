'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

const formatDisplay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// O(1) — zero-pad and join
const toIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DatePicker = ({ value, onChange, placeholder = 'Pick a date', className }: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          className={cn(
            'w-40 justify-start gap-2 text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className='h-4 w-4 shrink-0' />
          {value ? formatDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toIso(date) : undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export { DatePicker };
