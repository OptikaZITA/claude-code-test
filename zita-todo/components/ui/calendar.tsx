'use client'

import * as React from 'react'
import { DayPicker, useDayPicker, useNavigation, type DayPickerProps } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

import { cn } from '@/lib/utils/cn'

// Custom caption with navigation arrows in the same row
function CustomCaption({ calendarMonth }: { calendarMonth: { date: Date } }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          'h-7 w-7 p-0 inline-flex items-center justify-center rounded-md',
          'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          'transition-colors'
        )}
        aria-label="Predchádzajúci mesiac"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
        {format(calendarMonth.date, 'LLLL yyyy', { locale: sk })}
      </span>

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          'h-7 w-7 p-0 inline-flex items-center justify-center rounded-md',
          'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          'transition-colors'
        )}
        aria-label="Nasledujúci mesiac"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

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
        months: 'flex flex-col gap-2',
        month: 'flex flex-col gap-2',
        // Hide default nav - we use custom caption
        nav: 'hidden',
        month_caption: 'hidden',
        caption_label: 'hidden',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-[var(--text-secondary)] w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-1',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-[var(--color-primary)]/10',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md'
        ),
        day_button: cn(
          'h-9 w-9 p-0 font-normal',
          'inline-flex items-center justify-center rounded-md',
          'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1',
          'transition-colors cursor-pointer'
        ),
        range_start: 'day-range-start bg-[var(--color-primary)] text-white rounded-l-md hover:bg-[var(--color-primary)]',
        range_end: 'day-range-end bg-[var(--color-primary)] text-white rounded-r-md hover:bg-[var(--color-primary)]',
        range_middle: 'day-range-middle bg-[var(--color-primary)]/10',
        selected: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]',
        today: 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold',
        outside: 'text-[var(--text-secondary)] opacity-50',
        disabled: 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        MonthCaption: CustomCaption,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
