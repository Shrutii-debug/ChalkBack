import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../api'
import WordCloud   from '../components/WordCloud'
import MoodMeter   from '../components/MoodMeter'

// ── Helpers ────────────────────────────────────────────────────────────────
const card = (style = {}) => ({
  background: '#1a2e22',
  border: '1px solid #2d5040',
  borderRadius: '16px',
  padding: '20px',
  ...style,
})

const TABS = ['Overview', 'Feedback', 'Q&A']

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()

  const [teacher,   setTeacher]   = useState(null)
  const [summary,   setSummary]   = useState(null)
  const [wordcloud, setWordcloud] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState('Overview')
  const [answers,   setAnswers]   = useState({})   // { [questionId]: text }
  const [answering, setAnswering] = useState(null) // id currently being submitted

  // ── Fetch all data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [me, sum, wc, fb, qa] = await Promise.all([
        api.get('/dashboard/me'),
        api.get('/dashboard/summary'),
        api.get('/dashboard/wordcloud'),
        api.get('/dashboard/feedback'),
        api.get('/dashboard/qa'),
      ])
      setTeacher(me.data)
      setSummary(sum.data)
      setWordcloud(wc.data || [])
      setFeedbacks(fb.data || [])
      setQuestions(qa.data || [])
    } catch {
      // auth error handled by PrivateRoute
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + auto-refresh every 10 s
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await api.post('/auth/logout')
    navigate('/login')
  }

  // ── Answer a question ─────────────────────────────────────────────────────
  const submitAnswer = async (qId) => {
    const text = (answers[qId] || '').trim()
    if (!text) { toast.error('Please write an answer first'); return }
    setAnswering(qId)
    try {
      await api.post(`/dashboard/qa/${qId}/answer`, { answer_text: text })
      toast.success('Answer posted!')
      setAnswers(a => ({ ...a, [qId]: '' }))
      fetchData()
    } catch {
      toast.error('Failed to post answer')
    } finally {
      setAnswering(null)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1a12' }}>
        <div className="spinner" />
      </div>
    )
  }

  // Derived data
  const unanswered = (questions || []).filter(q => !q.is_answered)
  const answered   = (questions || []).filter(q =>  q.is_answered)

  const radarData = summary ? [
    { subject: 'Clarity',     value: +summary.avg_clarity.toFixed(1)     },
    { subject: 'Engagement',  value: +summary.avg_engagement.toFixed(1)  },
    { subject: 'Pace',        value: +summary.avg_pace.toFixed(1)        },
    { subject: 'Helpfulness', value: +summary.avg_helpfulness.toFixed(1) },
  ] : []

  const pollData = summary
    ? Object.entries(summary.poll_counts || {}).map(([name, value]) => ({ name, value }))
    : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0e1a12' }}>

      {/* ── Topbar ── */}
      <div style={{
        borderBottom: '1px solid #2d5040',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0e1a12',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🖊️</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', color: '#4ade80' }}>
            ChalkBack
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {teacher && (
            <span style={{ fontSize: '14px', color: '#6b9e7e' }}>
              {teacher.name}
            </span>
          )}
          {teacher && (
            <a
              href={`/f/${teacher.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#1e3828',
                border: '1px solid #2d5040',
                color: '#4ade80',
                textDecoration: 'none',
              }}
            >
              Student link ↗
            </a>
          )}
          <button
            onClick={logout}
            style={{
              fontSize: '13px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid #2d5040',
              color: '#6b9e7e',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>

        {/* Page title */}
        <div className="fade-up" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, margin: '0 0 4px', color: '#e8f5ee' }}>
            Your Dashboard
          </h1>
          <p style={{ color: '#6b9e7e', margin: 0, fontSize: '14px' }}>
            Live updates every 10 seconds
            {summary && (
              <> · <strong style={{ color: '#4ade80' }}>{summary.total_responses}</strong> responses total</>
            )}
          </p>
        </div>

        {/* ── Stat cards ── */}
        {summary && (
          <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Clarity',     val: summary.avg_clarity.toFixed(1)     },
              { label: 'Engagement',  val: summary.avg_engagement.toFixed(1)  },
              { label: 'Pace',        val: summary.avg_pace.toFixed(1)        },
              { label: 'Helpfulness', val: summary.avg_helpfulness.toFixed(1) },
            ].map(s => (
              <div key={s.label} style={card({ textAlign: 'center', padding: '16px 12px' })}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#4ade80', fontFamily: 'Syne, sans-serif' }}>
                  {s.val}
                </div>
                <div style={{ fontSize: '12px', color: '#6b9e7e', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="fade-up-2" style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #2d5040', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: 'none',
                color: tab === t ? '#4ade80' : '#6b9e7e',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                borderBottom: tab === t ? '2px solid #4ade80' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.15s',
              }}
            >
              {t}
              {t === 'Q&A' && unanswered.length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: '#f4c430',
                  color: '#0e1a12',
                  fontWeight: 700,
                }}>
                  {unanswered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════ OVERVIEW TAB ════════════ */}
        {tab === 'Overview' && summary && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

              {/* Mood Meter */}
              <div style={card()}>
                <SectionTitle>😊 Mood Breakdown</SectionTitle>
                <MoodMeter moodCounts={summary.mood_counts} total={summary.total_responses} />
              </div>

              {/* Radar Chart */}
              <div style={card()}>
                <SectionTitle>⭐ Rating Radar</SectionTitle>
                {summary.total_responses > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#2d5040" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#6b9e7e', fontSize: 12, fontFamily: 'DM Sans' }}
                      />
                      <Radar
                        name="Ratings"
                        dataKey="value"
                        stroke="#4ade80"
                        fill="#4ade80"
                        fillOpacity={0.25}
                        dot={{ fill: '#4ade80', r: 3 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyMsg />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

              {/* Poll Results */}
              <div style={card()}>
                <SectionTitle>📊 Class Pace Poll</SectionTitle>
                {pollData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={pollData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: '#6b9e7e', fontSize: 12, fontFamily: 'DM Sans' }} />
                      <YAxis tick={{ fill: '#6b9e7e', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: '#1e3828', border: '1px solid #2d5040', borderRadius: '8px', color: '#e8f5ee' }}
                        cursor={{ fill: '#ffffff08' }}
                      />
                      <Bar dataKey="value" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyMsg />
                )}
              </div>

              {/* Word Cloud */}
              <div style={card()}>
                <SectionTitle>☁️ Word Cloud</SectionTitle>
                <WordCloud words={wordcloud} />
              </div>
            </div>

            {/* One Thing to Improve */}
            <div style={card()}>
              <SectionTitle>💡 One Thing to Improve</SectionTitle>
              {(summary.one_thing_snippets || []).length === 0 ? (
                <EmptyMsg />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {summary.one_thing_snippets.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#1e3828',
                      border: '1px solid #2d5040',
                    }}>
                      <span style={{ color: '#4ade80', fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>→</span>
                      <p style={{ margin: 0, fontSize: '14px', color: '#a0c8b0', lineHeight: 1.5 }}>{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ FEEDBACK TAB ════════════ */}
        {tab === 'Feedback' && (
          <div>
            {feedbacks.length === 0 ? (
              <div style={{ ...card(), textAlign: 'center', padding: '48px' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📭</span>
                <p style={{ color: '#6b9e7e', margin: 0 }}>No feedback yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {feedbacks.map(f => (
                  <FeedbackCard key={f.id} f={f} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ Q&A TAB ════════════ */}
        {tab === 'Q&A' && (
          <div>
            {/* Unanswered */}
            {unanswered.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', color: '#f4c430', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Needs answer ({unanswered.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {unanswered.map(q => (
                    <div key={q.id} style={card({ borderColor: '#f4c43040' })}>
                      <p style={{ color: '#e8f5ee', fontSize: '15px', margin: '0 0 14px', lineHeight: 1.5 }}>
                        🙋 {q.question_text}
                      </p>
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                        placeholder="Type your answer here…"
                        rows={2}
                        style={{
                          width: '100%',
                          background: '#1e3828',
                          border: '1px solid #2d5040',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#e8f5ee',
                          outline: 'none',
                          fontSize: '14px',
                          resize: 'vertical',
                          marginBottom: '10px',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => submitAnswer(q.id)}
                        disabled={answering === q.id}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          background: answering === q.id ? '#2d5040' : '#4ade80',
                          color: answering === q.id ? '#6b9e7e' : '#0e1a12',
                          fontFamily: 'Syne, sans-serif',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: answering === q.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {answering === q.id ? 'Posting…' : 'Post Answer'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Answered */}
            {answered.length > 0 && (
              <div>
                <p style={{ fontSize: '13px', color: '#6b9e7e', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Answered ({answered.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {answered.map(q => (
                    <div key={q.id} style={card({ padding: '16px' })}>
                      <p style={{ color: '#6b9e7e', fontSize: '14px', margin: '0 0 8px' }}>🙋 {q.question_text}</p>
                      <p style={{ color: '#a0c8b0', fontSize: '14px', margin: 0, paddingLeft: '14px', borderLeft: '2px solid #2d5040' }}>
                        {q.answer_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questions.length === 0 && (
              <div style={{ ...card(), textAlign: 'center', padding: '48px' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>💬</span>
                <p style={{ color: '#6b9e7e', margin: 0 }}>No questions yet</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h3 style={{
      fontFamily: 'Syne, sans-serif',
      fontSize: '14px',
      fontWeight: 700,
      color: '#e8f5ee',
      margin: '0 0 14px',
    }}>
      {children}
    </h3>
  )
}

function EmptyMsg() {
  return <p style={{ color: '#4b7a5e', fontSize: '13px', margin: 0 }}>Not enough data yet</p>
}

const MOOD_LABELS = { 1: '😕 Confused', 2: '😐 Okay', 3: '😊 Good', 4: '🔥 Amazing' }

function FeedbackCard({ f }) {
  return (
    <div style={{
      background: '#1a2e22',
      border: '1px solid #2d5040',
      borderRadius: '14px',
      padding: '16px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{
          padding: '3px 10px',
          borderRadius: '20px',
          background: '#1e3828',
          border: '1px solid #2d5040',
          fontSize: '13px',
          color: '#a0c8b0',
        }}>
          {MOOD_LABELS[f.mood] || '—'}
        </span>
        {f.quick_poll_answer && (
          <span style={{
            padding: '3px 10px',
            borderRadius: '20px',
            background: '#1e3828',
            border: '1px solid #2d5040',
            fontSize: '13px',
            color: '#6b9e7e',
          }}>
            {f.quick_poll_answer}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#4b7a5e' }}>
          {new Date(f.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Ratings row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {[
          { label: 'Clarity',    val: f.rating_clarity     },
          { label: 'Engage',     val: f.rating_engagement  },
          { label: 'Pace',       val: f.rating_pace        },
          { label: 'Help',       val: f.rating_helpfulness },
        ].map(r => (
          r.val > 0 && (
            <div key={r.label} style={{ fontSize: '12px', color: '#6b9e7e' }}>
              {r.label}: <span style={{ color: '#4ade80', fontWeight: 600 }}>{'⭐'.repeat(r.val)}</span>
            </div>
          )
        ))}
      </div>

      {/* Texts */}
      {f.feedback_text && (
        <p style={{ fontSize: '14px', color: '#a0c8b0', margin: '0 0 8px', lineHeight: 1.5 }}>
          {f.feedback_text}
        </p>
      )}
      {f.one_thing_to_improve && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          background: '#1e3828',
          borderLeft: '3px solid #4ade80',
        }}>
          <p style={{ fontSize: '13px', color: '#4ade80', margin: '0 0 2px', fontWeight: 600 }}>One thing to improve</p>
          <p style={{ fontSize: '14px', color: '#a0c8b0', margin: 0, lineHeight: 1.5 }}>{f.one_thing_to_improve}</p>
        </div>
      )}
    </div>
  )
}