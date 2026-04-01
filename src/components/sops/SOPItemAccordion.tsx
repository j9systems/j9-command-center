import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import type { SOPItemWithSubs } from '@/hooks/useSOPs'
import SOPMarkdown from './SOPMarkdown'
import SOPSubItems from './SOPSubItems'

interface SOPItemAccordionProps {
  item: SOPItemWithSubs
}

function AccessBadge({ level }: { level: number | null }) {
  if (!level || level === 1) return null
  const label = level === 2 ? 'Internal' : 'Leadership'
  const color =
    level === 2
      ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}>
      {label}
    </span>
  )
}

function OwnerBadge({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-1 rounded-md bg-purple-muted text-purple font-medium">
      {label}
    </span>
  )
}

export default function SOPItemAccordion({ item }: SOPItemAccordionProps) {
  const [open, setOpen] = useState(false)

  const hasBody =
    item.outcome ||
    item.primary_owner ||
    item.secondary_owner ||
    item.attachment_link ||
    item.value ||
    item.sub_items.length > 0

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => hasBody && setOpen(!open)}
        className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors duration-200 ${
          hasBody ? 'hover:bg-surface-hover cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{item.name}</span>
            <AccessBadge level={item.role_access_level} />
          </div>
          {item.scope && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{item.scope}</p>
          )}
        </div>
        {hasBody && (
          <ChevronDown
            size={18}
            className={`text-text-secondary shrink-0 mt-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 pb-5 pt-1 border-t border-border space-y-4">
          {item.outcome && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">
                Outcome
              </p>
              <p className="text-sm text-text-primary">{item.outcome}</p>
            </div>
          )}

          {(item.primary_owner || item.secondary_owner) && (
            <div className="flex items-center gap-2 flex-wrap">
              {item.primary_owner && <OwnerBadge label={item.primary_owner} />}
              {item.secondary_owner && <OwnerBadge label={item.secondary_owner} />}
            </div>
          )}

          {item.attachment_link && (
            <a
              href={item.attachment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-purple hover:text-purple-hover font-medium transition-colors"
            >
              <ExternalLink size={14} />
              View Attachment
            </a>
          )}

          {item.value && <SOPMarkdown content={item.value} />}

          {item.sub_items.length > 0 && <SOPSubItems subItems={item.sub_items} />}
        </div>
      </div>
    </div>
  )
}
