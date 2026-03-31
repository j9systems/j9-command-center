import { useContext } from 'react'
import { ActiveTimeLogContext } from '@/context/ActiveTimeLogContext'

export function useActiveTimeLog() {
  return useContext(ActiveTimeLogContext)
}
