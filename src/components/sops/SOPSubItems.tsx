import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { SOPSubItem } from '@/hooks/useSOPs'
import SOPMarkdown from './SOPMarkdown'

interface SOPSubItemsProps {
  subItems: SOPSubItem[]
}

export default function SOPSubItems({ subItems }: SOPSubItemsProps) {
  const defaultExpanded = subItems.length <= 3
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(defaultExpanded ? subItems.map((s) => s.id) : [])
  )

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
        Sub-items
      </p>
      {subItems.map((sub) => {
        const isOpen = expandedIds.has(sub.id)
        return (
          <div key={sub.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(sub.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-surface-hover transition-colors duration-200"
            >
              <span className="text-sm font-medium text-text-primary">{sub.name}</span>
              <ChevronDown
                size={16}
                className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
              {sub.value && (
                <div className="px-4 pb-3 border-t border-border pt-3">
                  <SOPMarkdown content={sub.value} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
