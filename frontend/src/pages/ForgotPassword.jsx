import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email) return toast.error('Please enter your email')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success('Reset link sent!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
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
            Forgot password?
          </h1>
          <p style={{ color: '#4d7a5e', margin: 0, fontSize: '14px' }}>
            Enter your email and we'll send a reset link
          </p>
        </div>

        <div style={{
          background: 'rgba(20, 38, 26, 0.8)',
          border: '1px solid rgba(45, 80, 64, 0.8)',
          borderRadius: '24px',
          padding: '32px',
          backdropFilter: 'blur(12px)',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '40px', margin: '0 0 16px' }}>📬</p>
              <p style={{ color: '#4ade80', fontWeight: 600, marginBottom: '8px' }}>Reset link sent!</p>
              <p style={{ color: '#4d7a5e', fontSize: '13px', marginBottom: '24px' }}>
                Check your email for the reset link. It expires in 1 hour.
              </p>
              <Link to="/login" style={{ color: '#4ade80', fontSize: '13px' }}>← Back to login</Link>
            </div>
          ) : (
            <>
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
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@school.com"
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
                  marginBottom: '16px',
                }}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#3d6b4f', margin: 0 }}>
                <Link to="/login" style={{ color: '#4ade80', textDecoration: 'none' }}>← Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}