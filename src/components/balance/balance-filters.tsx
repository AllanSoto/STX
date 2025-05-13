'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BalanceFiltersProps {
  startDate: Date | undefined;
  setStartDate: Dispatch<SetStateAction<Date | undefined>>;
  endDate: Date | undefined;
  setEndDate: Dispatch<SetStateAction<Date | undefined>>;
  onResetFilters: () => void;
  t: (key: string, fallback?: string) => string;
  disabled?: boolean; // Added disabled prop
}

export function BalanceFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onResetFilters,
  t,
  disabled = false, // Default to false
}: BalanceFiltersProps) {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="balanceStartDate" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('balance.filters.startDate', 'Start Date')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="balanceStartDate"
                variant="outline"
                disabled={disabled} // Apply disabled prop
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>{t('balance.filters.pickDate', 'Pick a date')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                disabled={disabled} // Apply disabled prop
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label htmlFor="balanceEndDate" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('balance.filters.endDate', 'End Date')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="balanceEndDate"
                variant="outline"
                disabled={disabled} // Apply disabled prop
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>{t('balance.filters.pickDate', 'Pick a date')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) =>
                  disabled || (startDate ? date < startDate : false) // Apply disabled prop
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onResetFilters} variant="ghost" disabled={disabled}> {/* Apply disabled prop */}
          <X className="mr-2 h-4 w-4" />
          {t('balance.filters.resetButton', 'Reset Filters')}
        </Button>
      </div>
    </div>
  );
}
