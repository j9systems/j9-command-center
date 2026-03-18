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
    <div className="flex items-center justify-center h-full px-4 bg-canvas">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-tight">
            <span className="text-accent">J9</span> Command Center
          </h1>
          <p className="text-text-secondary text-sm mt-1">Agency management</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-card">
          {step === 'email' ? (
            <form onSubmit={handleSendCode}>
              <div className="flex items-center gap-2 mb-4">
                <Mail size={18} className="text-accent" />
                <h2 className="text-base font-semibold text-text-primary">
                  Sign in with email
                </h2>
              </div>
              <p className="text-text-secondary text-sm mb-4">
                Enter your email to receive a login code.
              </p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-input border border-border rounded-md text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-accent focus:shadow-focus transition-all duration-150"
              />
              {error && (
                <p className="text-danger text-sm mt-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full mt-4 py-2.5 bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md shadow-accent hover:shadow-[0_6px_24px_rgba(123,97,255,0.45)] transition-all duration-150"
              >
                {loading ? 'Sending...' : 'Send login code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(null); setOtpCode('') }}
                className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-4 transition-colors duration-150"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <h2 className="text-base font-semibold text-text-primary mb-1">
                Check your email
              </h2>
              <p className="text-text-secondary text-sm mb-4">
                Enter the code sent to <span className="text-text-primary">{email}</span>
              </p>
              <input
                type="text"
                placeholder="Enter 8-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                autoFocus
                inputMode="numeric"
                className="w-full px-3.5 py-2.5 bg-input border border-border rounded-md text-base text-text-primary text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-text-tertiary focus:outline-none focus:border-border-accent focus:shadow-focus transition-all duration-150"
              />
              {error && (
                <p className="text-danger text-sm mt-2">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || otpCode.length < 8}
                className="w-full mt-4 py-2.5 bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md shadow-accent hover:shadow-[0_6px_24px_rgba(123,97,255,0.45)] transition-all duration-150"
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
