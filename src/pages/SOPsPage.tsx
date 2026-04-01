import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useSOPs } from '@/hooks/useSOPs'
import type { SOPWithItems } from '@/hooks/useSOPs'
import SOPSidebar from '@/components/sops/SOPSidebar'
import SOPItemAccordion from '@/components/sops/SOPItemAccordion'

export default function SOPsPage() {
  const { data: sops, isLoading, error } = useSOPs()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Set initial active section once data loads
  const activeSopId = activeId ?? sops?.[0]?.id ?? null

  const searchResults = useMemo(() => {
    if (!sops || !search.trim()) return null
    const q = search.toLowerCase()
    const results: SOPWithItems[] = []

    for (const sop of sops) {
      const matchingItems = sop.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sub_items.some((sub) => sub.name.toLowerCase().includes(q))
      )
      if (matchingItems.length > 0) {
        results.push({ ...sop, items: matchingItems })
      }
    }
    return results
  }, [sops, search])

  const isSearching = search.trim().length > 0

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-text-secondary text-sm">Loading SOPs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-red-400 text-sm">Failed to load SOPs</div>
      </div>
    )
  }

  if (!sops || sops.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-text-secondary text-sm">No SOPs found</div>
      </div>
    )
  }

  const activeSection = sops.find((s) => s.id === activeSopId)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 md:px-8 md:pt-6 pb-0">
        <h1 className="text-2xl font-bold text-text-primary">SOPs</h1>
        <p className="text-sm text-text-secondary mt-1">Standard Operating Procedures</p>
      </div>

      <div className="flex flex-1 min-h-0 mt-4">
        {/* Left sidebar — SOP sections */}
        <SOPSidebar sops={sops} activeId={activeSopId} onSelect={setActiveId} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Search bar */}
          <div className="px-4 md:px-6 py-4 border-b border-border">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search SOPs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-9 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-purple transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {isSearching ? (
              <SearchResults results={searchResults ?? []} />
            ) : activeSection ? (
              <SectionContent section={activeSection} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionContent({ section }: { section: SOPWithItems }) {
  if (section.items.length === 0) {
    return <p className="text-sm text-text-secondary">No items in this section.</p>
  }

  return (
    <div className="space-y-3">
      {section.items.map((item) => (
        <SOPItemAccordion key={item.id} item={item} />
      ))}
    </div>
  )
}

function SearchResults({ results }: { results: SOPWithItems[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-text-secondary">No results found.</p>
  }

  return (
    <div className="space-y-6">
      {results.map((sop) => (
        <div key={sop.id}>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            {sop.name}
          </p>
          <div className="space-y-3">
            {sop.items.map((item) => (
              <SOPItemAccordion key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
