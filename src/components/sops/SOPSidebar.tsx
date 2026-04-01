import type { SOP } from '@/hooks/useSOPs'

interface SOPSidebarProps {
  sops: SOP[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function SOPSidebar({ sops, activeId, onSelect }: SOPSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border overflow-y-auto">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Sections
          </p>
          <div className="flex flex-col gap-1">
            {sops.map((sop) => (
              <button
                key={sop.id}
                onClick={() => onSelect(sop.id)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeId === sop.id
                    ? 'bg-purple-muted text-purple'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {sop.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className="lg:hidden px-4 pt-4">
        <select
          value={activeId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-purple"
        >
          {sops.map((sop) => (
            <option key={sop.id} value={sop.id}>
              {sop.name}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
