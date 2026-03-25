import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import api from '../api'

export default function PrivateRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api.get('/dashboard/me')
      .then(() => setStatus('ok'))
      .catch(() => setStatus('unauth'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: '#111c16' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: '#4ade80', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (status === 'unauth') return <Navigate to="/login" replace />

  return children
}