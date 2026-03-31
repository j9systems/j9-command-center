import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Briefcase } from 'lucide-react'

export default function AccountLeadsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/accounts/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Account
      </Link>

      <div className="bg-surface rounded-xl border border-border p-8 text-center">
        <Briefcase size={40} className="text-text-secondary/30 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-text-primary mb-2">Leads</h2>
        <p className="text-sm text-text-secondary">Leads management coming soon.</p>
      </div>
    </div>
  )
}
