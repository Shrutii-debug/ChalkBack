import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

export default function Register() {
  const [form, setForm]     = useState({ name: '', email: '', password: '', subject: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email and password are required')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('Account created! Welcome.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
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
  }

  const fields = [
    { key: 'name',     label: 'Full Name',           type: 'text',     placeholder: 'Miss Agarwal',    required: true  },
    { key: 'subject',  label: 'Subject (optional)',   type: 'text',     placeholder: 'Mathematics',     required: false },
    { key: 'email',    label: 'Email address',        type: 'email',    placeholder: 'you@school.com',  required: true  },
    { key: 'password', label: 'Password',             type: 'password', placeholder: '••••••••',        required: true  },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#0e1a12',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div className="fade-up" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '28px' }}>🖊️</span>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: '36px',
              fontWeight: 800,
              color: '#4ade80',
              margin: 0,
            }}>
              ChalkBack
            </h1>
          </div>
          <p style={{ color: '#6b9e7e', margin: 0, fontSize: '14px' }}>
            Create your teacher account
          </p>
        </div>

        <div className="fade-up-1" style={{
          background: '#1a2e22',
          border: '1px solid #2d5040',
          borderRadius: '20px',
          padding: '32px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b9e7e', marginBottom: '6px' }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              </div>
            ))}

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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#6b9e7e' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4ade80', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}