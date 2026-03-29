import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields')
      return
    }
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

  const inputStyle = {
    width: '100%',
    background: '#1e3828',
    border: '1px solid #2d5040',
    borderRadius: '12px',
    padding: '12px 16px',
    color: '#e8f5ee',
    outline: 'none',
    fontSize: '15px',
    transition: 'border-color 0.2s',
  }

  return (
<div style={{
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',   // 👈 reduced
  background: '#0e1a12',
  overflowX: 'hidden', // 👈 VERY IMPORTANT
}}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '28px' }}>🖊️</span>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 'clamp(28px, 6vw, 36px)',
              fontWeight: 800,
              color: '#4ade80',
              margin: 0,
              letterSpacing: '-0.5px',
            }}>
              ChalkBack
            </h1>
          </div>
          <p style={{ color: '#6b9e7e', margin: 0, fontSize: '14px' }}>
            Teacher portal — sign in to view your feedback
          </p>
        </div>

        {/* Card */}
        <div className="fade-up-1" style={{
          background: '#1a2e22',
          border: '1px solid #2d5040',
          borderRadius: '20px',
          padding: 'clamp(20px, 5vw, 32px)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b9e7e', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="you@school.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#6b9e7e', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                border: 'none',
                background: loading ? '#2d5040' : '#4ade80',
                color: loading ? '#6b9e7e' : '#0e1a12',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginTop: '4px',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>

          <p style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '13px',
            color: '#6b9e7e',
          }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 500 }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}