'use client'

import * as React from 'react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { sk } from 'date-fns/locale'

import { cn } from '@/lib/utils/cn'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={sk}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-between items-center px-1 py-2',
        caption_label: 'text-sm font-medium text-[var(--text-primary)]',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'h-7 w-7 p-0 opacity-60 hover:opacity-100',
          'inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)]',
          'text-[var(--text-primary)]'
        ),
        button_next: cn(
          'h-7 w-7 p-0 opacity-60 hover:opacity-100',
          'inline-flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)]',
          'text-[var(--text-primary)]'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'text-[var(--text-secondary)] rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-[var(--color-primary)]/10',
          '[&:has([aria-selected].day-range-end)]:rounded-r-md',
          '[&:has([aria-selected].day-outside)]:bg-[var(--color-primary)]/50',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md'
        ),
        day_button: cn(
          'h-9 w-9 p-0 font-normal',
          'inline-flex items-center justify-center rounded-md',
          'aria-selected:opacity-100 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1'
        ),
        range_start:
          'day-range-start bg-[var(--color-primary)] text-white rounded-l-md hover:bg-[var(--color-primary)] hover:text-white',
        range_end:
          'day-range-end bg-[var(--color-primary)] text-white rounded-r-md hover:bg-[var(--color-primary)] hover:text-white',
        range_middle:
          'day-range-middle bg-[var(--color-primary)]/10 text-[var(--text-primary)]',
        selected:
          'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)] hover:text-white focus:bg-[var(--color-primary)] focus:text-white',
        today: 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
        outside:
          'day-outside text-[var(--text-secondary)] opacity-50 aria-selected:bg-[var(--color-primary)]/50 aria-selected:text-[var(--text-secondary)] aria-selected:opacity-30',
        disabled: 'text-[var(--text-secondary)] opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
