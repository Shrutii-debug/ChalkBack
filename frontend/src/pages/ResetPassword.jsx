import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

function validatePassword(p) {
  if (p.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(p)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(p)) return 'Password must contain at least one number'
  if (!/[^A-Za-z0-9]/.test(p)) return 'Password must contain at least one special character'
  return ''
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    const pwErr = validatePassword(password)
    if (pwErr) return toast.error(pwErr)

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      toast.success('Password reset! Please log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090f0b' }}>
        <div style={{ textAlign: 'center', color: '#f87171' }}>
          <p style={{ fontSize: '40px' }}>⚠️</p>
          <p>Invalid reset link.</p>
          <Link to="/forgot-password" style={{ color: '#4ade80' }}>Request a new one</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#090f0b',
      fontFamily: 'Instrument Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontSize: '36px',
            fontWeight: 900,
            color: '#f0faf4',
            margin: '0 0 8px',
            letterSpacing: '-1px',
          }}>
            Reset password
          </h1>
          <p style={{ color: '#4d7a5e', margin: 0, fontSize: '14px' }}>Enter your new password below</p>
        </div>

        <div style={{
          background: 'rgba(20, 38, 26, 0.8)',
          border: '1px solid rgba(45, 80, 64, 0.8)',
          borderRadius: '24px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#3d6b4f',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: 'rgba(9, 15, 11, 0.8)',
                border: '1px solid #1e3828',
                borderRadius: '12px',
                padding: '13px 16px',
                color: '#e8f5ee',
                outline: 'none',
                fontSize: '15px',
                boxSizing: 'border-box',
              }}
            />
            {password && validatePassword(password) && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#f87171' }}>
                ⚠️ {validatePassword(password)}
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#2d5040' : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
              color: '#060e09',
              fontFamily: 'Cabinet Grotesk, sans-serif',
              fontWeight: 800,
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  )
}