import { MONTHS } from './types'
import type { Person } from './types'

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function clampDay(month: number, day: number, year: number) {
  return Math.min(day, daysInMonth(year, month))
}

export function nextBirthday(month: number, day: number, from = new Date()) {
  const today = startOfDay(from)
  const thisYearDay = clampDay(month, day, today.getFullYear())
  let next = new Date(today.getFullYear(), month - 1, thisYearDay)
  if (next < today) {
    const y = today.getFullYear() + 1
    next = new Date(y, month - 1, clampDay(month, day, y))
  }
  return next
}

export function daysUntil(month: number, day: number, from = new Date()) {
  const today = startOfDay(from)
  const next = nextBirthday(month, day, from)
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

export function turningAge(person: Person, from = new Date()) {
  if (!person.year) return null
  return nextBirthday(person.month, person.day, from).getFullYear() - person.year
}

export function formatShortDate(month: number, day: number) {
  return `${MONTHS[month - 1].slice(0, 3)} ${day}`
}

export function formatLongDate(month: number, day: number, year: number | null) {
  const base = `${MONTHS[month - 1]} ${day}`
  return year ? `${base}, ${year}` : base
}

export function weekdayLabel(month: number, day: number, from = new Date()) {
  return nextBirthday(month, day, from).toLocaleDateString(undefined, {
    weekday: 'long',
  })
}

export function todayLabel(from = new Date()) {
  return from.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function greeting(from = new Date()) {
  const hour = from.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function untilPhrase(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}

export function sortBySoonest(people: Person[], from = new Date()) {
  return [...people].sort((a, b) => {
    const delta = daysUntil(a.month, a.day, from) - daysUntil(b.month, b.day, from)
    if (delta !== 0) return delta
    return a.name.localeCompare(b.name)
  })
}

export function groupByMonth(people: Person[]) {
  const groups: { month: number; people: Person[] }[] = []
  for (let month = 1; month <= 12; month += 1) {
    const list = people
      .filter((person) => person.month === month)
      .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name))
    if (list.length) groups.push({ month, people: list })
  }
  return groups
}

export function avatarTone(name: string) {
  const tones = ['forest', 'moss', 'rose', 'clay', 'sage'] as const
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return tones[hash % tones.length]
}
