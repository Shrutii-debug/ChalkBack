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
  const { slug } = useParams()
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
      api.get(`/form/${slug}`),
      api.get(`/form/${slug}/settings`),
    ]).then(([teacherRes, settingsRes]) => {
      setTeacher(teacherRes.data)
      setSettings(settingsRes.data)
    }).catch(() => setNotFound(true))
  }, [slug])

  const setRating = (field, value) => {
    setRatings(prev => ({ ...prev, [field]: value }))
  }

  const submit = async e => {
    e.preventDefault()
    if (settings.show_mood && !mood) {
      return toast.error('Please pick a mood')
    }
    if (settings.show_one_thing && !oneThing.trim()) {
      return toast.error('"One thing to improve" is required')
    }

    setLoading(true)
    try {
      await api.post('/feedback', {
        teacher_slug: slug,
        mood,
        ratings,
        feedback_text: feedbackText,
        one_thing_to_improve: oneThing,
        quick_poll_answer: pollAnswer,
      })

      if (settings.show_qa && questionText.trim()) {
        await api.post('/questions', {
          teacher_slug: slug,
          question_text: questionText.trim(),
        })
      }
      setStep(2)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🪣</div>
        <p className="font-display text-xl text-white">Teacher not found</p>
      </div>
    </div>
  )

  if (!teacher || !settings) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-chalk-muted animate-pulse font-display">Loading...</p>
    </div>
  )

  if (step === 2) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">✅</div>
        <h2 className="font-display text-3xl font-bold text-white mb-3">
          Feedback sent!
        </h2>
        <p className="text-chalk-muted text-sm mb-8">
          Your response is completely anonymous.
        </p>
        {settings.show_qa && (
          <Link
            to={`/f/${slug}/qa`}
            className="inline-block px-6 py-3 rounded-xl text-sm font-display font-semibold"
            style={{ background: '#1a2e22', border: '1px solid #2d5040', color: '#e8f5ee' }}>
            View answered questions →
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#111c16' }}>
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-1">
            <span>🍀</span>
            <span className="font-display text-sm font-semibold text-chalk-muted tracking-widest uppercase">
              ChalkBack
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mt-2">
            Feedback for {teacher.name}
          </h1>
          {teacher.subject && (
            <p className="text-chalk-muted text-sm mt-1">{teacher.subject}</p>
          )}
          <div
            className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
            style={{ background: '#1a2e22', border: '1px solid #2d5040', color: '#6b9e7e' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#4ade80', display: 'inline-block'
            }}></span>
            100% anonymous — your identity is never stored
          </div>
        </div>

        <form onSubmit={submit} className="space-y-6">

          {settings.show_mood && (
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h3 className="font-display font-semibold text-white mb-4">
                How do you feel about this class overall?
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl transition-all"
                    style={{
                      background: mood === m.value ? '#0f3d24' : '#111c16',
                      border: `2px solid ${mood === m.value ? '#4ade80' : '#2d5040'}`,
                    }}>
                    <span style={{ fontSize: 28 }}>{m.emoji}</span>
                    <span className="text-xs text-chalk-muted">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.show_poll && (
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h3 className="font-display font-semibold text-white mb-1">
                How was the pace of the class?
              </h3>
              <p className="text-chalk-muted text-xs mb-4">Quick poll — one tap</p>
              <div className="flex gap-3 flex-wrap">
                {POLL_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPollAnswer(opt)}
                    className="px-5 py-2 rounded-full text-sm font-display transition-all"
                    style={{
                      background: pollAnswer === opt ? '#f4c430' : '#111c16',
                      color: pollAnswer === opt ? '#111c16' : '#e8f5ee',
                      border: `1px solid ${pollAnswer === opt ? '#f4c430' : '#2d5040'}`,
                      fontWeight: pollAnswer === opt ? 600 : 400,
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settings.show_ratings && settings.rating_fields?.length > 0 && (
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h3 className="font-display font-semibold text-white mb-4">
                Rate the teaching
              </h3>
              <div className="grid grid-cols-2 gap-5">
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
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h3 className="font-display font-semibold text-white mb-1">
                Any thoughts you want to share?
              </h3>
              <p className="text-chalk-muted text-xs mb-3">
                Optional — completely anonymous
              </p>
              <textarea
                rows={4}
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="What went well? What could be better? Anything else..."
                className="w-full px-4 py-3 rounded-xl text-chalk-text text-sm outline-none resize-none focus:ring-2 focus:ring-green-500"
                style={{ background: '#111c16', border: '1px solid #2d5040', color: '#e8f5ee' }}
              />
            </div>
          )}

          {settings.show_one_thing && (
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '2px solid #2d5040' }}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display font-semibold text-white">
                  One thing to improve
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: '#f4c43022',
                    color: '#f4c430',
                    border: '1px solid #f4c43044'
                  }}>
                  Required
                </span>
              </div>
              <p className="text-chalk-muted text-xs mb-3">
                Be honest — this is the most valuable feedback
              </p>
              <textarea
                rows={3}
                value={oneThing}
                onChange={e => setOneThing(e.target.value)}
                placeholder="If you could change one thing about how this class is taught..."
                className="w-full px-4 py-3 rounded-xl text-chalk-text text-sm outline-none resize-none focus:ring-2 focus:ring-yellow-400"
                style={{ background: '#111c16', border: '1px solid #2d5040', color: '#e8f5ee'  }}
                required
              />
            </div>
          )}

          {settings.show_qa && (
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h3 className="font-display font-semibold text-white mb-1">
                Ask a question anonymously
              </h3>
              <p className="text-chalk-muted text-xs mb-3">
                Too shy to ask in class? The teacher will answer publicly — your name stays hidden.
              </p>
              <textarea
                rows={3}
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                placeholder="Something you didn't understand, or wanted to ask..."
                className="w-full px-4 py-3 rounded-xl text-chalk-text text-sm outline-none resize-none focus:ring-2 focus:ring-green-500"
                style={{ background: '#111c16', border: '1px solid #2d5040' }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-display font-bold text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: '#4ade80', color: '#111c16' }}>
            {loading ? 'Submitting...' : 'Submit Feedback Anonymously →'}
          </button>

          <p className="text-center text-chalk-muted text-xs pb-6">
            Your name, device, and IP address are never stored.
          </p>

        </form>
      </div>
    </div>
  )
}