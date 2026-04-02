import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (step === 'credentials') {
      if (!form.email || !form.password) return toast.error('Please fill in all fields')
      setLoading(true)
      try {
        const res = await api.post('/auth/login', form)

        // 202 = credentials ok but 2FA required
        if (res.status === 202 && res.data.two_fa_required) {
          setStep('otp')
          toast('Enter the OTP from your authenticator app', { icon: '🔐' })
          return
        }

        toast.success('Welcome back!')
        navigate('/dashboard')
      } catch (err) {
        toast.error(err.response?.data?.error || 'Login failed')
      } finally {
        setLoading(false)
      }
    } else {
      // OTP step — re-send credentials + otp_code together
      if (!otpCode) return toast.error('Please enter your OTP code')
      setLoading(true)
      try {
        await api.post('/auth/login', { ...form, otp_code: otpCode })
        toast.success('Welcome back!')
        navigate('/dashboard')
      } catch (err) {
        const msg = err.response?.data?.error || 'Invalid OTP'
        toast.error(msg)
        // If banned, go back to credentials step
        if (err.response?.status === 429) setStep('credentials')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Sans:wght@400;500;600&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: #090f0b;
          overflow: hidden;
          position: relative;
          font-family: 'Instrument Sans', sans-serif;
        }

        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 15% 80%, rgba(74,222,128,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 85% 20%, rgba(74,222,128,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          position: relative;
          z-index: 1;
          animation: fadeUp 0.5s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-logo { text-align: center; margin-bottom: 36px; }

        .login-logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 10px;
          border-radius: 100px;
          background: rgba(74,222,128,0.08);
          border: 1px solid rgba(74,222,128,0.2);
          margin-bottom: 20px;
        }

        .login-logo-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
          animation: pulse 2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #4ade80; }
          50% { opacity: 0.6; box-shadow: 0 0 16px #4ade80; }
        }

        .login-logo-text {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: #4ade80;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .login-title {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(30px, 7vw, 40px);
          color: #f0faf4;
          margin: 0 0 8px;
          line-height: 1.05;
          letter-spacing: -1px;
        }

        .login-subtitle { font-size: 14px; color: #4d7a5e; margin: 0; }

        .login-form-box {
          background: rgba(20, 38, 26, 0.8);
          border: 1px solid rgba(45, 80, 64, 0.8);
          border-radius: 24px;
          padding: clamp(24px, 6vw, 36px);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 0 1px rgba(74,222,128,0.03), 0 32px 64px rgba(0,0,0,0.4);
        }

        .field-group { display: flex; flex-direction: column; gap: 14px; margin-bottom: 8px; }

        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #3d6b4f;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .field-input {
          width: 100%;
          background: rgba(9, 15, 11, 0.8);
          border: 1px solid #1e3828;
          border-radius: 12px;
          padding: 13px 16px;
          color: #e8f5ee;
          outline: none;
          font-size: 15px;
          font-family: 'Instrument Sans', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .field-input:focus {
          border-color: rgba(74,222,128,0.5);
          box-shadow: 0 0 0 3px rgba(74,222,128,0.08);
        }

        .field-input::placeholder { color: #2d5040; }

        .forgot-link {
          display: block;
          text-align: right;
          font-size: 12px;
          color: #4ade80;
          text-decoration: none;
          margin-bottom: 16px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .forgot-link:hover { opacity: 1; }

        .login-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: #060e09;
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.01em;
        }

        .login-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(74,222,128,0.3);
        }

        .login-btn:active:not(:disabled) { transform: scale(0.98); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-footer {
          text-align: center;
          margin-top: 18px;
          font-size: 13px;
          color: #3d6b4f;
        }

        .login-footer a {
          color: #4ade80;
          text-decoration: none;
          font-weight: 600;
          border-bottom: 1px solid rgba(74,222,128,0.3);
          transition: border-color 0.2s;
        }

        .login-footer a:hover { border-color: #4ade80; }

        .otp-hint {
          font-size: 12px;
          color: #4d7a5e;
          margin: 8px 0 16px;
          text-align: center;
        }

        .otp-back {
          background: none;
          border: none;
          color: #3d6b4f;
          font-size: 12px;
          cursor: pointer;
          margin-top: 12px;
          display: block;
          width: 100%;
          text-align: center;
          font-family: 'Instrument Sans', sans-serif;
          transition: color 0.2s;
        }
        .otp-back:hover { color: #4ade80; }

        .otp-icon {
          text-align: center;
          font-size: 36px;
          margin-bottom: 12px;
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-badge">
              <div className="login-logo-dot" />
              <span className="login-logo-text">ChalkBack</span>
            </div>
            {step === 'credentials' ? (
              <>
                <h1 className="login-title">Welcome<br />back 👋</h1>
                <p className="login-subtitle">Sign in to your teacher portal</p>
              </>
            ) : (
              <>
                <h1 className="login-title">2FA Check 🔐</h1>
                <p className="login-subtitle">Open your authenticator app</p>
              </>
            )}
          </div>

          <div className="login-form-box">
            {step === 'credentials' ? (
              <>
                {/* autocomplete="off" prevents browser autofill on the whole form */}
                <div className="field-group" autoComplete="off">
                  <div>
                    <label className="field-label">Email address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="you@school.com"
                      className="field-input"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="field-label">Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={set('password')}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="••••••••"
                      className="field-input"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>

                <button onClick={handleSubmit} disabled={loading} className="login-btn">
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>

                <p className="login-footer">
                  No account?{' '}
                  <Link to="/register">Register here</Link>
                </p>
              </>
            ) : (
              <>
                <div className="otp-icon">📱</div>
                <p className="otp-hint">
                  Enter the 6-digit code from your authenticator app.<br />
                  It refreshes every 30 seconds.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label className="field-label">One-time password</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="123456"
                    className="field-input"
                    autoComplete="one-time-code"
                    style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                  />
                </div>

                <button onClick={handleSubmit} disabled={loading} className="login-btn">
                  {loading ? 'Verifying…' : 'Verify OTP →'}
                </button>

                <button className="otp-back" onClick={() => { setStep('credentials'); setOtpCode('') }}>
                  ← Use a different account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}