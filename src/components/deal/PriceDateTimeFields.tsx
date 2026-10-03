import { format } from 'date-fns';
import { CalendarIcon, Clock3 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PriceDateTimeFieldsProps {
  value: Date;
  onChange: (value: Date) => void;
}

export default function PriceDateTimeFields({ value, onChange }: PriceDateTimeFieldsProps) {
  const timeInputId = useId();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    const nextValue = new Date(date);
    nextValue.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(nextValue);
    setCalendarOpen(false);
  };

  const handleTimeChange = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
    const nextValue = new Date(value);
    nextValue.setHours(hours, minutes, 0, 0);
    onChange(nextValue);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-10 w-full justify-start px-3 font-normal">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {format(value, 'EEE, dd MMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label htmlFor={timeInputId} className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Time
        </label>
        <div className="relative">
          <Clock3 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id={timeInputId}
            type="time"
            value={format(value, 'HH:mm')}
            onChange={(event) => handleTimeChange(event.target.value)}
            className="h-10 pl-9"
          />
        </div>
      </div>
    </div>
  );
}
