'use client'

import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  bsMonths,
  bsMonthsNep,
  toNepaliDigits,
  formatBSDate,
  getBSMonthDays,
  getBSYearRange,
  getBSMonthGrid,
  getTodayBS,
} from '@/lib/bs-calendar'
import { cn } from '@/lib/utils'

// Short Nepali day headers (abbreviated)
const bsDayHeaders = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिहि', 'शुक्र', 'शनि']
const adDayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const adMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface BSCalendarPickerProps {
  value?: string // BS date in "YYYY-MM-DD" format
  onChange?: (date: string) => void // returns BS date in "YYYY-MM-DD" format
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

function parseBSDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return null
  return { year: parts[0], month: parts[1], day: parts[2] }
}

function toBSDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Approximate AD to BS conversion for the toggle feature
function adToBSApprox(adYear: number, adMonth: number, adDay: number): string {
  const bsYear = adYear + 57
  let bsMonth = adMonth - 3
  if (bsMonth <= 0) bsMonth += 12
  if (bsMonth > 12) bsMonth = 12
  const maxDays = getBSMonthDays(bsYear, bsMonth)
  const bsDay = Math.min(adDay, maxDays)
  return toBSDateString(bsYear, bsMonth, bsDay)
}

// Approximate BS to AD conversion for the toggle feature
function bsToADApprox(bsYear: number, bsMonth: number, bsDay: number): Date {
  const adYear = bsYear - 57
  let adMonth = bsMonth + 3
  if (adMonth > 12) adMonth -= 12
  const adDay = bsDay
  return new Date(adYear, adMonth - 1, adDay)
}

export function BSCalendarPicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  disabled = false,
  className,
}: BSCalendarPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [isBS, setIsBS] = React.useState(true)

  // Current view state (what's displayed in the calendar grid)
  const todayBS = React.useMemo(() => getTodayBS(), [])
  const todayParsed = React.useMemo(() => parseBSDate(todayBS), [todayBS])

  const parsedValue = React.useMemo(() => parseBSDate(value || ''), [value])

  const [viewYear, setViewYear] = React.useState(() => parsedValue?.year || todayParsed?.year || 2082)
  const [viewMonth, setViewMonth] = React.useState(() => parsedValue?.month || todayParsed?.month || 1)

  // Sync view when value changes externally
  React.useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year)
      setViewMonth(parsedValue.month)
    }
  }, [parsedValue])

  const yearRange = React.useMemo(() => getBSYearRange(), [])
  const monthGrid = React.useMemo(
    () => getBSMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  // Navigation handlers
  const handlePrevMonth = React.useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 1) {
        setViewYear((y) => Math.max(y - 1, yearRange[0]))
        return 12
      }
      return prev - 1
    })
  }, [yearRange])

  const handleNextMonth = React.useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 12) {
        setViewYear((y) => Math.min(y + 1, yearRange[yearRange.length - 1]))
        return 1
      }
      return prev + 1
    })
  }, [yearRange])

  const handlePrevYear = React.useCallback(() => {
    setViewYear((y) => Math.max(y - 1, yearRange[0]))
  }, [yearRange])

  const handleNextYear = React.useCallback(() => {
    setViewYear((y) => Math.min(y + 1, yearRange[yearRange.length - 1]))
  }, [yearRange])

  const handleDaySelect = React.useCallback(
    (day: number) => {
      const dateStr = toBSDateString(viewYear, viewMonth, day)
      onChange?.(dateStr)
      setOpen(false)
    },
    [viewYear, viewMonth, onChange]
  )

  const handleTodayClick = React.useCallback(() => {
    if (todayParsed) {
      setViewYear(todayParsed.year)
      setViewMonth(todayParsed.month)
      const dateStr = toBSDateString(todayParsed.year, todayParsed.month, todayParsed.day)
      onChange?.(dateStr)
      setOpen(false)
    }
  }, [todayParsed, onChange])

  // Format the display value
  const displayValue = React.useMemo(() => {
    if (!value) return null
    const formatted = formatBSDate(value)
    if (isBS) {
      return { en: formatted.en, nep: formatted.nep }
    }
    // AD mode: show the approximate AD date
    const parsed = parseBSDate(value)
    if (!parsed) return { en: formatted.en, nep: formatted.nep }
    const adDate = bsToADApprox(parsed.year, parsed.month, parsed.day)
    const adStr = `${adDate.getDate()} ${adMonths[adDate.getMonth()]} ${adDate.getFullYear()}`
    return { en: adStr, nep: formatted.nep }
  }, [value, isBS])

  // AD calendar grid for toggle
  const adGrid = React.useMemo(() => {
    if (isBS) return null
    // Show the AD equivalent month
    const adDate = bsToADApprox(viewYear, viewMonth, 1)
    const adYear = adDate.getFullYear()
    const adMonth = adDate.getMonth()
    const firstDay = new Date(adYear, adMonth, 1).getDay()
    const daysInMonth = new Date(adYear, adMonth + 1, 0).getDate()
    const weeks: (number | null)[][] = []
    let week: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) week.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day)
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      weeks.push(week)
    }
    return { weeks, year: adYear, month: adMonth + 1 }
  }, [isBS, viewYear, viewMonth])

  // Determine if today is in the current view month
  const isTodayInView = React.useMemo(() => {
    if (!todayParsed) return false
    if (isBS) {
      return todayParsed.year === viewYear && todayParsed.month === viewMonth
    }
    return false
  }, [todayParsed, viewYear, viewMonth, isBS])

  // Selected date in current view
  const isSelectedInView = React.useMemo(() => {
    if (!parsedValue) return false
    if (isBS) {
      return parsedValue.year === viewYear && parsedValue.month === viewMonth
    }
    return false
  }, [parsedValue, viewYear, viewMonth, isBS])

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal h-auto min-h-9 py-1.5 px-3',
              !value && 'text-muted-foreground'
            )}
          >
            <Calendar className="mr-2 h-4 w-4 shrink-0" />
            {value && displayValue ? (
              <span className="flex flex-col gap-0.5">
                <span className="text-sm leading-tight">{displayValue.en}</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {displayValue.nep}
                </span>
              </span>
            ) : (
              <span className="text-sm">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          sideOffset={8}
        >
          <div className="w-[320px]">
            {/* Header: Month/Year Navigation */}
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevYear}
                  title="Previous Year"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                {isBS ? (
                  <>
                    <span className="text-sm font-semibold leading-tight">
                      {bsMonths[viewMonth - 1]} {viewYear}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">
                      {bsMonthsNep[viewMonth - 1]} {toNepaliDigits(viewYear)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold leading-tight">
                      {adGrid ? `${adMonths[adGrid.month - 1]} ${adGrid.year}` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">
                      {bsMonthsNep[viewMonth - 1]} {toNepaliDigits(viewYear)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextYear}
                  title="Next Year"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* BS/AD Toggle */}
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {isBS ? 'बिक्रम सम्बत (BS)' : 'Gregorian (AD)'}
              </span>
              <button
                type="button"
                onClick={() => setIsBS(!isBS)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isBS ? 'bg-primary' : 'bg-input'
                )}
                role="switch"
                aria-checked={isBS}
              >
                <span
                  className={cn(
                    'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
                    isBS ? 'translate-x-[calc(100%-2px)]' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b">
              {(isBS ? bsDayHeaders : adDayHeaders).map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-center py-1.5 text-xs font-medium',
                    i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="p-2">
              {isBS ? (
                // BS Calendar Grid
                <div className="grid gap-0.5">
                  {monthGrid.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7">
                      {week.map((day, di) => {
                        const isToday =
                          isTodayInView &&
                          todayParsed &&
                          day === todayParsed.day
                        const isSelected =
                          isSelectedInView &&
                          parsedValue &&
                          day === parsedValue.day
                        const isSunday = di === 0
                        const isSaturday = di === 6

                        return (
                          <button
                            key={di}
                            type="button"
                            disabled={day === null}
                            onClick={() => day !== null && handleDaySelect(day)}
                            className={cn(
                              'relative flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'hover:bg-accent hover:text-accent-foreground',
                              'disabled:pointer-events-none disabled:opacity-0',
                              isSunday && !isSelected && 'text-red-500',
                              isSaturday && !isSelected && 'text-blue-500',
                              isToday &&
                                !isSelected &&
                                'ring-2 ring-primary/50 font-semibold',
                              isSelected &&
                                'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold',
                              isToday && isSelected && 'bg-primary text-primary-foreground'
                            )}
                          >
                            {day !== null ? (
                              <span>{isBS ? day : day}</span>
                            ) : null}
                            {isToday && !isSelected && (
                              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                // AD Calendar Grid (when toggled)
                <div className="grid gap-0.5">
                  {adGrid?.weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7">
                      {week.map((day, di) => {
                        const isSunday = di === 0
                        const isSaturday = di === 6

                        return (
                          <button
                            key={di}
                            type="button"
                            disabled={day === null}
                            onClick={() => {
                              if (day !== null && adGrid) {
                                const bsDate = adToBSApprox(
                                  adGrid.year,
                                  adGrid.month,
                                  day
                                )
                                onChange?.(bsDate)
                                setOpen(false)
                              }
                            }}
                            className={cn(
                              'relative flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'hover:bg-accent hover:text-accent-foreground',
                              'disabled:pointer-events-none disabled:opacity-0',
                              isSunday && 'text-red-500',
                              isSaturday && 'text-blue-500'
                            )}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer: Today Button */}
            <div className="flex items-center justify-between border-t px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleTodayClick}
              >
                आज ({todayParsed ? `${toNepaliDigits(todayParsed.day)} ${bsMonthsNep[todayParsed.month - 1]}` : ''})
              </Button>
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    onChange?.('')
                    setOpen(false)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default BSCalendarPicker
