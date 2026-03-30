import { useState } from 'react'
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

export default function ChangePassword() {
  const [form, setForm] = useState({ current_password: '', new_password: '' })
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.current_password || !form.new_password) {
      return toast.error('Both fields are required')
    }
    const pwErr = validatePassword(form.new_password)
    if (pwErr) return toast.error(pwErr)

    setLoading(true)
    try {
      await api.post('/dashboard/change-password', form)
      toast.success('Password changed successfully!')
      setForm({ current_password: '', new_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
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
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#6b9e7e',
    marginBottom: '6px',
    fontWeight: 600,
  }

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: 'Instrument Sans, sans-serif',
    }}>
      <h2 style={{
        fontFamily: 'Cabinet Grotesk, sans-serif',
        fontWeight: 800,
        fontSize: '24px',
        color: '#f0faf4',
        marginBottom: '8px',
      }}>
        Change Password
      </h2>
      <p style={{ color: '#4d7a5e', fontSize: '13px', marginBottom: '28px' }}>
        Make sure your new password is strong!
      </p>

      <div style={{
        background: '#1a2e22',
        border: '1px solid #2d5040',
        borderRadius: '20px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div>
          <label style={labelStyle}>Current Password</label>
          <input
            type="password"
            value={form.current_password}
            onChange={set('current_password')}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={form.new_password}
            onChange={set('new_password')}
            placeholder="••••••••"
            style={inputStyle}
          />
          {form.new_password && validatePassword(form.new_password) && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#f87171' }}>
              ⚠️ {validatePassword(form.new_password)}
            </p>
          )}
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
            color: '#0e1a12',
            fontFamily: 'Cabinet Grotesk, sans-serif',
            fontWeight: 800,
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '4px',
          }}
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </div>
  )
}