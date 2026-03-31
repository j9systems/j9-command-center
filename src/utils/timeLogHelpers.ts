import type { TimeLogBreak } from '@/types/database'

/**
 * Calculate net worked hours excluding break time.
 * Returns hours rounded to 2 decimal places.
 */
export function calculateNetHours(
  startDateTime: string,
  endDateTime: string | null,
  breaks: TimeLogBreak[]
): number {
  const start = new Date(startDateTime).getTime()
  const end = endDateTime ? new Date(endDateTime).getTime() : Date.now()
  const totalMs = end - start

  const breakMs = breaks.reduce((sum, b) => {
    const bStart = new Date(b.break_start).getTime()
    const bEnd = b.break_end ? new Date(b.break_end).getTime() : Date.now()
    return sum + (bEnd - bStart)
  }, 0)

  const netMs = Math.max(0, totalMs - breakMs)
  return Math.round((netMs / 3_600_000) * 100) / 100
}

/**
 * Calculate net elapsed seconds for the live ticker.
 */
export function calculateNetSeconds(
  startDateTime: string,
  breaks: TimeLogBreak[]
): number {
  const start = new Date(startDateTime).getTime()
  const now = Date.now()
  const totalMs = now - start

  const breakMs = breaks.reduce((sum, b) => {
    const bStart = new Date(b.break_start).getTime()
    const bEnd = b.break_end ? new Date(b.break_end).getTime() : now
    return sum + (bEnd - bStart)
  }, 0)

  return Math.max(0, Math.floor((totalMs - breakMs) / 1000))
}

/**
 * Format seconds as HH:MM:SS.
 */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}
