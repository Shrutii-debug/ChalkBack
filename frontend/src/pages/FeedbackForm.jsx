import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import StarRating from '../components/StarRating'

const MOODS = [
  { value: 1, emoji: '😕', label: 'Confused' },
  { value: 2, emoji: '😐', label: 'Okay'     },
  { value: 3, emoji: '😊', label: 'Good'     },
  { value: 4, emoji: '🔥', label: 'Amazing'  },
]

const POLL_OPTIONS = ['Too fast', 'Just right', 'Too slow']

const inputStyle = {
  width: '100%',
  background: '#1e3828',
  border: '1px solid #2d5040',
  borderRadius: '12px',
  padding: '12px 16px',
  color: '#e8f5ee',
  outline: 'none',
  fontSize: '15px',
  resize: 'vertical',
}

export default function FeedbackForm() {
  const { slug } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    mood: 0,
    rating_clarity: 0,
    rating_engagement: 0,
    rating_pace: 0,
    rating_helpfulness: 0,
    feedback_text: '',
    one_thing_to_improve: '',
    quick_poll_answer: '',
    question_text: '',
  })

  useEffect(() => {
    api.get(`/form/${slug}`)
      .then(r => { setTeacher(r.data); setLoading(false) })
      .catch(() => { setLoading(false) })
  }, [slug])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.one_thing_to_improve.trim()) {
      toast.error('Please fill in "One thing to improve" — it\'s required')
      return
    }
    if (form.mood === 0) {
      toast.error('Please pick a mood')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/feedback', {
        teacher_slug:        slug,
        mood:                form.mood,
        rating_clarity:      form.rating_clarity,
        rating_engagement:   form.rating_engagement,
        rating_pace:         form.rating_pace,
        rating_helpfulness:  form.rating_helpfulness,
        feedback_text:       form.feedback_text,
        one_thing_to_improve: form.one_thing_to_improve,
        quick_poll_answer:   form.quick_poll_answer,
      })

      // submit question separately if filled
      if (form.question_text.trim()) {
        await api.post('/questions', {
          teacher_slug:  slug,
          question_text: form.question_text,
        })
      }

      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1a12' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!teacher) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1a12', flexDirection: 'column', gap: '12px' }}>
        <span style={{ fontSize: '48px' }}>🔍</span>
        <p style={{ color: '#6b9e7e', fontSize: '16px' }}>Teacher not found</p>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1a12', padding: '24px' }}>
        <div className="fade-up" style={{
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', color: '#4ade80', marginBottom: '12px' }}>
            Feedback sent!
          </h2>
          <p style={{ color: '#6b9e7e', lineHeight: 1.6, marginBottom: '24px' }}>
            Your feedback has been submitted anonymously.<br />
            Your name, device, and IP address are never stored.
          </p>
          <Link to={`/f/${slug}/qa`} style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: '10px',
            background: '#1e3828',
            border: '1px solid #2d5040',
            color: '#4ade80',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            View class Q&amp;A →
          </Link>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0e1a12', padding: '24px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* Header */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: '32px', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', color: '#6b9e7e', margin: '0 0 6px' }}>Feedback for</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '30px', fontWeight: 800, color: '#e8f5ee', margin: '0 0 4px' }}>
            {teacher.name}
          </h1>
          {teacher.subject && (
            <span style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: '20px',
              background: '#1e3828',
              border: '1px solid #2d5040',
              color: '#4ade80',
              fontSize: '13px',
            }}>
              {teacher.subject}
            </span>
          )}
          <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '12px', opacity: 0.7 }}>
            🔒 Completely anonymous — your identity is never stored
          </p>
        </div>

        {/* ── Section 1: Mood ── */}
        <Section delay="fade-up-1" title="How did class feel today?" required>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => set('mood', m.value)}
                style={{
                  flex: '1 1 calc(25% - 8px)',
                  minWidth: '70px',
                  padding: '14px 8px',
                  borderRadius: '14px',
                  border: `2px solid ${form.mood === m.value ? '#4ade80' : '#2d5040'}`,
                  background: form.mood === m.value ? '#1e4d2e' : '#1a2e22',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{m.emoji}</span>
                <span style={{ fontSize: '12px', color: form.mood === m.value ? '#4ade80' : '#6b9e7e', fontWeight: 500 }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ── Section 2: Quick Poll ── */}
        <Section delay="fade-up-2" title="How was the class pace?">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {POLL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => set('quick_poll_answer', form.quick_poll_answer === opt ? '' : opt)}
                style={{
                  flex: '1 1 auto',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${form.quick_poll_answer === opt ? '#4ade80' : '#2d5040'}`,
                  background: form.quick_poll_answer === opt ? '#1e4d2e' : '#1a2e22',
                  color: form.quick_poll_answer === opt ? '#4ade80' : '#6b9e7e',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Section 3: Star Ratings ── */}
        <Section delay="fade-up-3" title="Rate these aspects">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'rating_clarity',     label: 'Clarity of explanation' },
              { key: 'rating_engagement',  label: 'Engagement & energy'     },
              { key: 'rating_pace',        label: 'Lesson pace'             },
              { key: 'rating_helpfulness', label: 'Helpfulness'             },
            ].map(r => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#a0c8b0', minWidth: '160px' }}>{r.label}</span>
                <StarRating
                  value={form[r.key]}
                  onChange={v => set(r.key, v)}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Section 4: Open Feedback ── */}
        <Section delay="fade-up-4" title="Any other thoughts?">
          <textarea
            value={form.feedback_text}
            onChange={e => set('feedback_text', e.target.value)}
            placeholder="Write anything else you want to share…"
            rows={3}
            style={inputStyle}
          />
        </Section>

        {/* ── Section 5: One Thing ── */}
        <Section delay="fade-up-5" title="One thing to improve" required badge="Required">
          <textarea
            value={form.one_thing_to_improve}
            onChange={e => set('one_thing_to_improve', e.target.value)}
            placeholder="The one thing that would make the class better…"
            rows={3}
            style={{ ...inputStyle, borderColor: '#4ade8040' }}
          />
        </Section>

        {/* ── Section 6: Anonymous Q&A ── */}
        <Section delay="fade-up-6" title="Ask a question anonymously">
          <textarea
            value={form.question_text}
            onChange={e => set('question_text', e.target.value)}
            placeholder="A question you were too shy to ask in class… (optional)"
            rows={2}
            style={inputStyle}
          />
          <p style={{ fontSize: '12px', color: '#6b9e7e', marginTop: '6px' }}>
            The teacher will answer publicly, but your name stays hidden.
          </p>
        </Section>

        {/* Submit */}
        <div style={{ marginTop: '8px', marginBottom: '40px' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              border: 'none',
              background: submitting ? '#2d5040' : '#4ade80',
              color: submitting ? '#6b9e7e' : '#0e1a12',
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '16px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#4b7a5e', marginTop: '10px' }}>
            Your name, device, and IP address are never stored.
          </p>
        </div>
      </div>
    </div>
  )
}

// Small helper wrapper for form sections
function Section({ title, children, delay = 'fade-up', required, badge }) {
  return (
    <div className={delay} style={{
      background: '#1a2e22',
      border: '1px solid #2d5040',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', color: '#e8f5ee', margin: 0 }}>
          {title}
        </h3>
        {required && (
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '6px',
            background: '#1e4d2e',
            color: '#4ade80',
            border: '1px solid #4ade8040',
          }}>
            {badge || 'Required'}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}