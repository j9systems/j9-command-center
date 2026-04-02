import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

interface UserProfile {
  first_name: string | null
  last_name: string | null
  email: string | null
  photo: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data } = await supabase
        .from('team')
        .select('first_name, last_name, email, photo')
        .eq('email', session.user.email!)
        .maybeSingle()

      setProfile(data ?? {
        first_name: null,
        last_name: null,
        email: session.user.email ?? null,
        photo: null,
      })
    }
    loadProfile()
  }, [])

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'User'
    : ''

  const initials = profile
    ? (profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '') || (profile.email?.[0]?.toUpperCase() ?? 'U')
    : ''

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setLoading(true)

    // Verify current password by re-authenticating
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) {
      setError('Unable to verify your session. Please log in again.')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    })

    if (signInError) {
      setError('Current password is incorrect.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }

    setLoading(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-text-primary mb-6">Profile</h1>

      {/* Profile info */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-6">
        <div className="flex items-center gap-4">
          {profile?.photo ? (
            <img src={profile.photo} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-purple-muted text-purple flex items-center justify-center text-lg font-semibold">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-medium text-text-primary truncate">{displayName}</p>
            {profile?.email && (
              <p className="text-sm text-text-secondary truncate">{profile.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Password update form */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-base font-medium text-text-primary mb-4">Update Password</h2>

        <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-400 text-sm bg-green-500/10 rounded-lg px-4 py-2">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-11 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-purple"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-11 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-purple"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-11 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-purple"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-purple hover:bg-purple-hover text-white text-sm font-medium transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
