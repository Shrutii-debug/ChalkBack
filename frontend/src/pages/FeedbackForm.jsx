import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import StarRating from '../components/StarRating'

const MOODS = [
  { value: 1, emoji: '😕', label: 'Confused' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '😊', label: 'Good' },
  { value: 4, emoji: '🔥', label: 'Amazing' },
]

const POLL_OPTIONS = ['Too fast', 'Just right', 'Too slow']

export default function FeedbackForm() {
  const { token } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [settings, setSettings] = useState(null)
  const [mood, setMood] = useState(0)
  const [ratings, setRatings] = useState({})
  const [feedbackText, setFeedbackText] = useState('')
  const [oneThing, setOneThing] = useState('')
  const [pollAnswer, setPollAnswer] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/form/${token}`),
      api.get(`/form/${token}/settings`),
    ]).then(([teacherRes, settingsRes]) => {
      setTeacher(teacherRes.data)
      setSettings(settingsRes.data)
    }).catch(() => setNotFound(true))
  }, [token])

  const setRating = (field, value) => setRatings(prev => ({ ...prev, [field]: value }))

  const submit = async e => {
    e.preventDefault()
    if (settings.show_mood && !mood) return toast.error('Please pick a mood')
    
    setLoading(true)
    try {
      await api.post('/feedback', {
        form_token: token, mood, ratings,
        feedback_text: feedbackText,
        one_thing_to_improve: oneThing,
        quick_poll_answer: pollAnswer,
      })
      if (settings.show_qa && questionText.trim()) {
        await api.post('/questions', { form_token: token, question_text: questionText.trim() })
      }
      setStep(2)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090f0b' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🪣</div>
        <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: 22, color: '#e8f5ee', fontWeight: 700 }}>Teacher not found</p>
      </div>
    </div>
  )

  if (!teacher || !settings) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090f0b' }}>
      <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', color: '#3d6b4f', fontSize: 16 }}>Loading…</p>
    </div>
  )

  if (step === 2) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;700;800;900&family=Instrument+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
        background: '#090f0b', fontFamily: 'Instrument Sans, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(74,222,128,0.1)',
            border: '2px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, margin: '0 auto 24px',
            boxShadow: '0 0 40px rgba(74,222,128,0.15)',
          }}>✅</div>
          <h2 style={{
            fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 900,
            fontSize: 32, color: '#f0faf4', margin: '0 0 10px', letterSpacing: '-0.5px',
          }}>Feedback sent!</h2>
          <p style={{ color: '#4d7a5e', fontSize: 14, marginBottom: 32 }}>
            Your response is completely anonymous. Thank you!
          </p>
          {settings.show_qa && (
            <Link to={`/f/${token}/qa`} style={{
              display: 'inline-block', padding: '12px 24px', borderRadius: 12,
              background: 'rgba(20,38,26,0.8)', border: '1px solid #2d5040',
              color: '#e8f5ee', textDecoration: 'none', fontSize: 14,
              fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700,
            }}>
              View answered questions →
            </Link>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Sans:wght@400;500;600&display=swap');

        .fb-root {
          min-height: 100vh;
          padding: 40px 16px 60px;
          background: #090f0b;
          font-family: 'Instrument Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .fb-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 40% at 80% 10%, rgba(74,222,128,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 50% 50% at 10% 90%, rgba(74,222,128,0.04) 0%, transparent 70%);
          pointer-events: none;
        }

        .fb-wrap {
          max-width: 560px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .fb-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .fb-brand {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 100px;
          background: rgba(74,222,128,0.07);
          border: 1px solid rgba(74,222,128,0.15);
          margin-bottom: 18px;
          font-size: 11px;
          font-weight: 600;
          color: #4ade80;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'Cabinet Grotesk', sans-serif;
        }

        .fb-brand-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: glow 2s ease infinite;
        }

        @keyframes glow {
          0%,100% { box-shadow: 0 0 6px #4ade80; }
          50% { box-shadow: 0 0 14px #4ade80; }
        }

        .fb-title {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(26px, 6vw, 36px);
          color: #f0faf4;
          margin: 0 0 6px;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .fb-subject {
          color: #4d7a5e;
          font-size: 14px;
          margin: 0 0 14px;
        }

        .anon-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 100px;
          background: rgba(74,222,128,0.06);
          border: 1px solid rgba(74,222,128,0.12);
          font-size: 12px;
          color: #3d6b4f;
        }

        .anon-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #4ade80;
        }

        /* Cards */
        .fb-card {
          background: rgba(20,38,26,0.7);
          border: 1px solid rgba(45,80,64,0.7);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 12px;
          backdrop-filter: blur(8px);
          transition: border-color 0.2s;
        }

        .fb-card:hover { border-color: rgba(74,222,128,0.2); }

        .fb-card-title {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: #e8f5ee;
          margin: 0 0 4px;
        }

        .fb-card-sub {
          font-size: 12px;
          color: #3d6b4f;
          margin: 0 0 16px;
        }

        /* Mood buttons */
        .mood-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        @media (max-width: 360px) {
          .mood-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .mood-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 8px;
          border-radius: 14px;
          border: 2px solid #1a2e22;
          background: rgba(9,15,11,0.8);
          cursor: pointer;
          transition: all 0.18s;
        }

        .mood-btn:hover { border-color: rgba(74,222,128,0.3); transform: translateY(-2px); }

        .mood-btn.active {
          border-color: #4ade80;
          background: rgba(74,222,128,0.08);
          box-shadow: 0 0 16px rgba(74,222,128,0.12);
        }

        .mood-emoji { font-size: 28px; line-height: 1; }
        .mood-label { font-size: 11px; color: #4d7a5e; font-weight: 500; }
        .mood-btn.active .mood-label { color: #4ade80; }

        /* Poll buttons */
        .poll-group { display: flex; gap: 8px; flex-wrap: wrap; }

        .poll-btn {
          padding: 9px 18px;
          border-radius: 100px;
          border: 1px solid #1e3828;
          background: rgba(9,15,11,0.8);
          color: #8ab89a;
          font-size: 13px;
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
        }

        .poll-btn:hover { border-color: rgba(74,222,128,0.3); color: #e8f5ee; }

        .poll-btn.active {
          background: #f4c430;
          border-color: #f4c430;
          color: #1a1000;
          box-shadow: 0 4px 16px rgba(244,196,48,0.25);
        }

        /* Textarea */
        .fb-textarea {
          width: 100%;
          background: rgba(9,15,11,0.9);
          border: 1px solid #1e3828;
          border-radius: 12px;
          padding: 13px 16px;
          color: #e8f5ee;
          outline: none;
          font-size: 14px;
          font-family: 'Instrument Sans', sans-serif;
          resize: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          line-height: 1.6;
        }

        .fb-textarea:focus {
          border-color: rgba(74,222,128,0.4);
          box-shadow: 0 0 0 3px rgba(74,222,128,0.07);
        }

        .fb-textarea::placeholder { color: #2d5040; }

        /* Required badge */
        .req-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 100px;
          background: rgba(244,196,48,0.1);
          border: 1px solid rgba(244,196,48,0.25);
          color: #f4c430;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-left: 8px;
          vertical-align: middle;
        }

        /* Gold card variant */
        .fb-card-gold {
          border-color: rgba(244,196,48,0.2);
        }
        .fb-card-gold:hover { border-color: rgba(244,196,48,0.35); }

        /* Submit button */
        .fb-submit {
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: #060e09;
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.01em;
          margin-top: 8px;
        }

        .fb-submit::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .fb-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(74,222,128,0.3);
        }

        .fb-submit:active:not(:disabled) { transform: scale(0.98); }
        .fb-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .fb-footnote {
          text-align: center;
          font-size: 12px;
          color: #2d5040;
          margin-top: 12px;
          padding-bottom: 8px;
        }

        /* Rating grid — single column by default, 2-col on wider phones */
        .rating-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        @media (min-width: 360px) {
          .rating-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="fb-root">
        <div className="fb-wrap">

          <div className="fb-header">
            <div className="fb-brand">
              <div className="fb-brand-dot" />
              ChalkBack
            </div>
            <h1 className="fb-title">Feedback for<br />{teacher.name}</h1>
            {teacher.subject && <p className="fb-subject">{teacher.subject}</p>}
            <div className="anon-badge">
              <div className="anon-dot" />
              100% anonymous — identity never stored
            </div>
          </div>

          <form onSubmit={submit} autoComplete="off">

            {settings.show_mood && (
              <div className="fb-card">
                <p className="fb-card-title">How do you feel about this class?</p>
                <p className="fb-card-sub">Pick your mood honestly</p>
                <div className="mood-grid">
                  {MOODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      className={`mood-btn${mood === m.value ? ' active' : ''}`}
                    >
                      <span className="mood-emoji">{m.emoji}</span>
                      <span className="mood-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {settings.show_poll && (
              <div className="fb-card">
                <p className="fb-card-title">How was the pace?</p>
                <p className="fb-card-sub">Quick poll — one tap</p>
                <div className="poll-group">
                  {POLL_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPollAnswer(opt)}
                      className={`poll-btn${pollAnswer === opt ? ' active' : ''}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {settings.show_ratings && settings.rating_fields?.length > 0 && (
              <div className="fb-card">
                <p className="fb-card-title">Rate the teaching</p>
                <p className="fb-card-sub">Tap the stars for each area</p>
                <div className="rating-grid">
                  {settings.rating_fields.map(field => (
                    <StarRating
                      key={field}
                      label={field}
                      value={ratings[field] || 0}
                      onChange={v => setRating(field, v)}
                    />
                  ))}
                </div>
              </div>
            )}

            {settings.show_feedback_text && (
              <div className="fb-card">
                <p className="fb-card-title">Any thoughts to share?</p>
                <p className="fb-card-sub">Optional — completely anonymous</p>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="What went well? What could be better? Anything else..."
                  className="fb-textarea"
                />
              </div>
            )}

            {settings.show_one_thing && (
              <div className="fb-card fb-card-gold">
                <p className="fb-card-title">
                  One thing to improve
                  
                </p>
                <p className="fb-card-sub">Be honest — this is the most valuable feedback</p>
                <textarea
                  rows={3}
                  value={oneThing}
                  onChange={e => setOneThing(e.target.value)}
                  placeholder="If you could change one thing about how this class is taught..."
                  className="fb-textarea"
                  autoComplete="off"
                  
                />
              </div>
            )}

            {settings.show_qa && (
              <div className="fb-card">
                <p className="fb-card-title">Ask a question anonymously</p>
                <p className="fb-card-sub">Too shy to ask in class? The teacher answers publicly — your name stays hidden.</p>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  placeholder="Something you didn't understand, or wanted to ask..."
                  className="fb-textarea"
                  autoComplete="off"
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="fb-submit">
              {loading ? 'Submitting…' : 'Submit Feedback Anonymously →'}
            </button>

            <p className="fb-footnote">Your name, device, and IP address are never stored.</p>
          </form>
        </div>
      </div>
    </>
  )
}