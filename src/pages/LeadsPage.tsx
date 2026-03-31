import { Target } from 'lucide-react'

export default function LeadsPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Target size={24} className="text-purple" />
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <Target size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">Coming Soon</p>
        <p className="text-sm mt-1">Lead management will be available here.</p>
      </div>
    </div>
  )
}
