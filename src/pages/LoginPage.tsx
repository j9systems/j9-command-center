import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { session, signIn, verifyOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email)
    if (error) {
      setError(error)
    } else {
      setStep('otp')
    }
    setLoading(false)
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await verifyOtp(email, otpCode)
    if (error) {
      setError(error)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            <span className="text-purple">J9</span> Command Center
          </h1>
          <p className="text-text-secondary text-sm mt-1">Agency management</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          {step === 'email' ? (
            <form onSubmit={handleSendCode}>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={18} className="text-purple" />
                <h2 className="text-sm font-medium text-text-primary">
                  Sign in with email
                </h2>
              </div>
              <p className="text-text-secondary text-xs mb-4">
                Enter your email to receive a login code.
              </p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 bg-black border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/25 transition-colors"
              />
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full mt-4 py-2.5 bg-purple hover:bg-purple-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Sending...' : 'Send login code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(null); setOtpCode('') }}
                className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs mb-4 transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <h2 className="text-sm font-medium text-text-primary mb-1">
                Check your email
              </h2>
              <p className="text-text-secondary text-xs mb-4">
                Enter the code sent to <span className="text-text-primary">{email}</span>
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                inputMode="numeric"
                className="w-full px-3 py-2.5 bg-black border border-border rounded-lg text-sm text-text-primary text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-text-secondary focus:outline-none focus:border-purple/50 focus:ring-1 focus:ring-purple/25 transition-colors"
              />
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full mt-4 py-2.5 bg-purple hover:bg-purple-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
