export type Person = {
  id: string
  name: string
  month: number
  day: number
  year: number | null
  relation: string
  notes: string
  gifts: string
  createdAt: string
  updatedAt: string
}

export type Draft = {
  name: string
  month: number
  day: number
  year: string
  relation: string
  notes: string
  gifts: string
}

export const RELATIONS = [
  'Family',
  'Friend',
  'Partner',
  'Colleague',
  'Neighbor',
] as const

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const
