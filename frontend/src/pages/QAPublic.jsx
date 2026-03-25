import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

export default function QAPublic() {
  const { slug } = useParams()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get(`/qa/${slug}`)
      .then(r => { setQuestions(r.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  return (
    <div style={{ minHeight: '100vh', background: '#0e1a12', padding: '24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: '28px', paddingTop: '16px' }}>
          <Link to={`/f/${slug}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#6b9e7e',
            textDecoration: 'none',
            marginBottom: '16px',
          }}>
            ← Back to feedback form
          </Link>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 800, color: '#e8f5ee', margin: '0 0 6px' }}>
            Class Q&amp;A
          </h1>
          <p style={{ color: '#6b9e7e', fontSize: '14px', margin: 0 }}>
            Anonymous questions answered by the teacher
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        )}

        {/* Empty */}
        {!loading && questions.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#1a2e22',
            border: '1px solid #2d5040',
            borderRadius: '16px',
          }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>💬</span>
            <p style={{ color: '#6b9e7e', margin: 0 }}>
              No answered questions yet. Submit a question on the feedback form!
            </p>
          </div>
        )}

        {/* Questions */}
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`fade-up-${Math.min(i + 1, 6)}`}
            style={{
              background: '#1a2e22',
              border: '1px solid #2d5040',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '14px',
            }}
          >
            {/* Question */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <span style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: '#1e3828',
                border: '1px solid #2d5040',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                🙋
              </span>
              <p style={{ color: '#a0c8b0', fontSize: '15px', margin: 0, lineHeight: 1.5 }}>
                {q.question_text}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#2d5040', marginBottom: '14px' }} />

            {/* Answer */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: '#1e4d2e',
                border: '1px solid #4ade8040',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                👩‍🏫
              </span>
              <p style={{ color: '#e8f5ee', fontSize: '15px', margin: 0, lineHeight: 1.5 }}>
                {q.answer_text}
              </p>
            </div>

            <p style={{ fontSize: '11px', color: '#4b7a5e', marginTop: '12px', marginBottom: 0 }}>
              {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}