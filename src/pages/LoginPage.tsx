import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <img
            src="https://res.cloudinary.com/duy32f0q4/image/upload/v1773874676/20A38445-8946-49E1-8330-AA60BFA12F74_1_1_fuobbj.png"
            alt="J9 Logo"
            className="w-12 h-12 rounded"
          />
          <h1 className="text-xl font-bold text-text-primary">
            <span className="text-purple">J9</span> Command Center
          </h1>
          <p className="text-text-secondary text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-purple"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-purple"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-purple hover:bg-purple-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
