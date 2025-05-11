
'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrderFiltersProps {
  startDate: Date | undefined;
  setStartDate: Dispatch<SetStateAction<Date | undefined>>;
  endDate: Date | undefined;
  setEndDate: Dispatch<SetStateAction<Date | undefined>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  onResetFilters: () => void;
  t: (key: string, fallback?: string) => string;
}

export function OrderFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchTerm,
  setSearchTerm,
  onResetFilters,
  t,
}: OrderFiltersProps) {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('history.filters.startDate', 'Start Date')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="startDate"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>{t('history.filters.pickDate', 'Pick a date')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('history.filters.endDate', 'End Date')}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="endDate"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>{t('history.filters.pickDate', 'Pick a date')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) =>
                  startDate ? date < startDate : false
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div>
          <label htmlFor="searchCrypto" className="block text-sm font-medium text-muted-foreground mb-1">
            {t('history.filters.searchCrypto', 'Search by Crypto')}
          </label>
          <Input
            id="searchCrypto"
            type="text"
            placeholder={t('history.filters.searchPlaceholder', 'Enter crypto symbol (e.g., BTC)')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onResetFilters} variant="ghost">
          <X className="mr-2 h-4 w-4" />
          {t('history.filters.resetButton', 'Reset Filters')}
        </Button>
      </div>
    </div>
  );
}
