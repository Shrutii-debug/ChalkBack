import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error('Please fill in all fields')
    setLoading(true)
    try {
      await api.post('/auth/login', form)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
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

        /* Animated radial glow blobs */
        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 15% 80%, rgba(74,222,128,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 85% 20%, rgba(74,222,128,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Subtle grain overlay */
        .login-root::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
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

        .login-logo {
          text-align: center;
          margin-bottom: 36px;
        }

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

        .login-subtitle {
          font-size: 14px;
          color: #4d7a5e;
          margin: 0;
        }

        .login-form-box {
          background: rgba(20, 38, 26, 0.8);
          border: 1px solid rgba(45, 80, 64, 0.8);
          border-radius: 24px;
          padding: clamp(24px, 6vw, 36px);
          backdrop-filter: blur(12px);
          box-shadow: 0 0 0 1px rgba(74,222,128,0.03), 0 32px 64px rgba(0,0,0,0.4);
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
        }

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
      `}</style>

      <div className="login-root">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-badge">
              <div className="login-logo-dot" />
              <span className="login-logo-text">ChalkBack</span>
            </div>
            <h1 className="login-title">Welcome<br />back 👋</h1>
            <p className="login-subtitle">Sign in to your teacher portal</p>
          </div>

          <div className="login-form-box">
            <div className="field-group">
              <div>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@school.com"
                  className="field-input"
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
                />
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading} className="login-btn">
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>

            <p className="login-footer">
              No account?{' '}
              <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}