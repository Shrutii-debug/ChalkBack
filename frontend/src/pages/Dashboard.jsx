import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import toast from 'react-hot-toast'
import api from '../api'
import WordCloud from '../components/WordCloud'
import MoodMeter from '../components/MoodMeter'

const TABS = ['Overview', 'Feedback', 'Q&A', 'Settings']

export default function Dashboard() {
  const [teacher, setTeacher] = useState(null)
  const [summary, setSummary] = useState(null)
  const [wordcloud, setWordcloud] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [questions, setQuestions] = useState([])
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [answerDraft, setAnswerDraft] = useState({})
  const navigate = useNavigate()

  const fetchAll = useCallback(async () => {
    try {
      const [me, sum, wc, fb, qa, set] = await Promise.all([
        api.get('/dashboard/me'),
        api.get('/dashboard/summary'),
        api.get('/dashboard/wordcloud'),
        api.get('/dashboard/feedback'),
        api.get('/dashboard/qa'),
        api.get('/dashboard/settings'),
      ])
      setTeacher(me.data)
      setSummary(sum.data)
      setWordcloud(wc.data || [])
      setFeedbacks(fb.data || [])
      setQuestions(qa.data || [])
      setSettings(set.data)
    } catch {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [fetchAll])

  useEffect(() => {
    if (settings && !settingsForm) {
      setSettingsForm({
        show_mood: settings.show_mood,
        show_poll: settings.show_poll,
        show_ratings: settings.show_ratings,
        show_feedback_text: settings.show_feedback_text,
        show_one_thing: settings.show_one_thing,
        show_qa: settings.show_qa,
        rating_fields: [...(settings.rating_fields || ['Clarity', 'Engagement', 'Pace', 'Helpfulness'])],
      })
    }
  }, [settings, settingsForm])

  const logout = async () => {
    await api.post('/auth/logout')
    navigate('/login')
  }

  const submitAnswer = async (qId) => {
    const text = answerDraft[qId]?.trim()
    if (!text) return toast.error('Answer cannot be empty')
    try {
      const r = await api.post(`/dashboard/qa/${qId}/answer`, { answer_text: text })
      setQuestions(qs => qs.map(q => q.id === qId ? r.data : q))
      setAnswerDraft(d => ({ ...d, [qId]: '' }))
      toast.success('Answer posted!')
    } catch {
      toast.error('Failed to post answer')
    }
  }

  const copyLink = () => {
    const url = `${window.location.origin}/f/${teacher?.slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
  }

  const saveSettings = async () => {
    if (!settingsForm.rating_fields.length) {
      return toast.error('Add at least one rating field')
    }
    try {
      await api.post('/dashboard/settings', settingsForm)
      setSettings({ ...settings, ...settingsForm })
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const addRatingField = () => {
    if (settingsForm.rating_fields.length >= 4) {
      return toast.error('Maximum 4 fields allowed')
    }
    setSettingsForm(f => ({
      ...f,
      rating_fields: [...f.rating_fields, 'New Field']
    }))
  }

  const removeRatingField = (index) => {
    if (settingsForm.rating_fields.length <= 1) {
      return toast.error('Minimum 1 field required')
    }
    setSettingsForm(f => ({
      ...f,
      rating_fields: f.rating_fields.filter((_, i) => i !== index)
    }))
  }

  const updateRatingField = (index, value) => {
    setSettingsForm(f => ({
      ...f,
      rating_fields: f.rating_fields.map((field, i) => i === index ? value : field)
    }))
  }

  if (!teacher || !summary || !settings) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-chalk-muted animate-pulse font-display text-lg">
        Loading dashboard...
      </p>
    </div>
  )

  const radarData = Object.entries(summary.avg_ratings || {}).map(([subject, value]) => ({
    subject,
    value: +value.toFixed(1)
  }))

  const pollData = Object.entries(summary.poll_counts || {}).map(([name, value]) => ({
    name,
    value
  }))

  const unanswered = questions.filter(q => !q.is_answered)
  const answered = questions.filter(q => q.is_answered)

  return (
    <div className="min-h-screen" style={{ background: '#111c16' }}>

      {/* Topbar */}
      <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{ background: '#111c16', borderBottom: '1px solid #2d5040' }}>
        <div className="flex items-center gap-3">
          <span>🍀</span>
          <span className="font-display font-bold text-white text-lg">ChalkBack</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyLink}
            className="px-4 py-2 rounded-lg text-sm font-display transition-all hover:opacity-80"
            style={{ background: '#1a2e22', border: '1px solid #2d5040', color: '#4ade80' }}>
            📋 Copy student link
          </button>
          <button
            onClick={logout}
            className="text-chalk-muted text-sm hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white">
            Hey, {teacher.name} 👋
          </h1>
          <p className="text-chalk-muted text-sm mt-1">
            {teacher.subject && `${teacher.subject} · `}
            Your feedback page:{' '}
            <span className="text-green-400 font-mono text-xs">/f/{teacher.slug}</span>
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Responses', value: summary.total_responses },
            { label: 'Rating Fields', value: settings.rating_fields?.length || 0 },
            { label: 'Questions Asked', value: questions.length },
            { label: 'Unanswered', value: unanswered.length },
          ].map(c => (
            <div key={c.label} className="rounded-2xl p-4"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <p className="text-chalk-muted text-xs mb-1">{c.label}</p>
              <p className="font-display text-2xl font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: '#1a2e22' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-display transition-all"
              style={{
                background: tab === t ? '#111c16' : 'transparent',
                color: tab === t ? '#ffffff' : '#6b9e7e',
                border: tab === t ? '1px solid #2d5040' : '1px solid transparent',
              }}>
              {t}
              {t === 'Q&A' && unanswered.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: '#f4c430', color: '#111c16' }}>
                  {unanswered.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'Overview' && (
          <div className="space-y-6">

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl p-6"
                style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
                <h2 className="font-display font-semibold text-white mb-4">Mood meter</h2>
                <MoodMeter moodCounts={summary.mood_counts} />
              </div>

              <div className="rounded-2xl p-6"
                style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
                <h2 className="font-display font-semibold text-white mb-4">Class pace poll</h2>
                {pollData.length === 0 ? (
                  <p className="text-chalk-muted text-sm">No poll responses yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={pollData} barSize={36}>
                      <XAxis dataKey="name"
                        tick={{ fill: '#6b9e7e', fontSize: 12, fontFamily: 'DM Sans' }}
                        axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: '#111c16',
                          border: '1px solid #2d5040',
                          borderRadius: 8,
                          color: '#e8f5ee',
                          fontSize: 12
                        }}
                        cursor={{ fill: '#2d5040' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {pollData.map((_, i) => (
                          <Cell key={i} fill={['#f87171', '#4ade80', '#fb923c'][i % 3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h2 className="font-display font-semibold text-white mb-4">Rating breakdown</h2>
              {radarData.length === 0 ? (
                <p className="text-chalk-muted text-sm">No ratings yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#2d5040" />
                    <PolarAngleAxis dataKey="subject"
                      tick={{ fill: '#6b9e7e', fontSize: 12, fontFamily: 'DM Sans' }} />
                    <Radar dataKey="value" stroke="#4ade80" fill="#4ade80"
                      fillOpacity={0.2} dot={{ fill: '#4ade80', r: 4 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h2 className="font-display font-semibold text-white mb-1">Word cloud</h2>
              <p className="text-chalk-muted text-xs mb-4">
                Most repeated words from all feedback
              </p>
              <WordCloud words={wordcloud} />
            </div>

            {summary.one_thing_snippets?.length > 0 && (
              <div className="rounded-2xl p-6"
                style={{ background: '#1a2e22', border: '2px solid #f4c43033' }}>
                <h2 className="font-display font-semibold text-white mb-1">
                  <span style={{ color: '#f4c430' }}>★</span> One thing to improve
                </h2>
                <p className="text-chalk-muted text-xs mb-4">
                  Anonymous student suggestions
                </p>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {summary.one_thing_snippets.map((s, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl"
                      style={{ background: '#111c16', border: '1px solid #2d5040' }}>
                      <span className="text-chalk-muted text-sm mt-0.5">→</span>
                      <p className="text-chalk-text text-sm leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {tab === 'Feedback' && (
          <div className="space-y-4">
            {feedbacks.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-chalk-muted">No feedback yet. Share your student link!</p>
              </div>
            )}
            {feedbacks.map(f => {
              const moodEmoji = ['', '😕', '😐', '😊', '🔥'][f.mood] || '—'
              const date = new Date(f.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short'
              })
              let ratingsObj = {}
              try { ratingsObj = JSON.parse(f.ratings_json) } catch {}

              return (
                <div key={f.id} className="rounded-2xl p-5"
                  style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 20 }}>{moodEmoji}</span>
                      {f.quick_poll_answer && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background: '#111c16',
                            color: '#6b9e7e',
                            border: '1px solid #2d5040'
                          }}>
                          {f.quick_poll_answer}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-chalk-muted">{date}</span>
                  </div>

                  {Object.keys(ratingsObj).length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {Object.entries(ratingsObj).map(([field, val]) => (
                        <div key={field} className="text-center p-2 rounded-lg"
                          style={{ background: '#111c16' }}>
                          <p className="text-xs text-chalk-muted">{field}</p>
                          <p className="font-display font-semibold text-white text-sm">{val}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.feedback_text && (
                    <p className="text-chalk-text text-sm leading-relaxed mb-2">
                      {f.feedback_text}
                    </p>
                  )}
                  {f.one_thing_to_improve && (
                    <div className="mt-2 p-3 rounded-lg flex gap-2"
                      style={{ background: '#111c16', border: '1px solid #f4c43033' }}>
                      <span style={{ color: '#f4c430', fontSize: 14 }}>★</span>
                      <p className="text-sm text-chalk-text">{f.one_thing_to_improve}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Q&A TAB */}
        {tab === 'Q&A' && (
          <div className="space-y-6">
            {unanswered.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                  Unanswered
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#f4c430', color: '#111c16' }}>
                    {unanswered.length}
                  </span>
                </h3>
                <div className="space-y-4">
                  {unanswered.map(q => (
                    <div key={q.id} className="rounded-2xl p-5"
                      style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
                      <div className="flex gap-3 mb-3">
                        <span style={{ fontSize: 18 }}>🙋</span>
                        <p className="text-chalk-text text-sm leading-relaxed">
                          {q.question_text}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={answerDraft[q.id] || ''}
                          onChange={e => setAnswerDraft(d => ({ ...d, [q.id]: e.target.value }))}
                          placeholder="Type your answer..."
                          className="flex-1 px-3 py-2 rounded-xl text-chalk-text text-sm outline-none resize-none focus:ring-1 focus:ring-green-500"
                          style={{ background: '#111c16', border: '1px solid #2d5040' }}
                        />
                        <button
                          onClick={() => submitAnswer(q.id)}
                          className="px-4 py-2 rounded-xl text-sm font-display font-semibold self-end"
                          style={{ background: '#4ade80', color: '#111c16' }}>
                          Post
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answered.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-chalk-muted mb-3">Answered</h3>
                <div className="space-y-4">
                  {answered.map(q => (
                    <div key={q.id} className="rounded-2xl p-5 opacity-75"
                      style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
                      <div className="flex gap-3 mb-3">
                        <span style={{ fontSize: 18 }}>🙋</span>
                        <p className="text-chalk-text text-sm">{q.question_text}</p>
                      </div>
                      <div className="ml-7 flex gap-3 pt-3"
                        style={{ borderTop: '1px solid #2d5040' }}>
                        <span style={{ fontSize: 18 }}>👨‍🏫</span>
                        <p className="text-chalk-muted text-sm">{q.answer_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questions.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-chalk-muted">No questions yet from students.</p>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'Settings' && settingsForm && (
          <div className="space-y-6">

            {/* Form section toggles */}
            <div className="rounded-2xl p-6"
              style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
              <h2 className="font-display font-semibold text-white mb-1">Form sections</h2>
              <p className="text-chalk-muted text-xs mb-5">
                Choose what appears on your student feedback form
              </p>
              <div className="space-y-4">
                {[
                  { key: 'show_mood', label: 'Mood Picker', desc: 'Students pick 😕 😐 😊 🔥' },
                  { key: 'show_poll', label: 'Quick Poll', desc: 'Too fast / Just right / Too slow' },
                  { key: 'show_ratings', label: 'Star Ratings', desc: 'Custom rating fields with stars' },
                  { key: 'show_feedback_text', label: 'Open Feedback', desc: 'Free text for general thoughts' },
                  { key: 'show_one_thing', label: 'One Thing to Improve', desc: 'Required improvement suggestion' },
                  { key: 'show_qa', label: 'Anonymous Q&A', desc: 'Students ask questions anonymously' },
                ].map(({ key, label, desc }) => (
                  <div key={key}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: '#111c16', border: '1px solid #2d5040' }}>
                    <div>
                      <p className="text-chalk-text text-sm font-display font-medium">{label}</p>
                      <p className="text-chalk-muted text-xs mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => setSettingsForm(f => ({ ...f, [key]: !f[key] }))}
                      className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                      style={{ background: settingsForm[key] ? '#4ade80' : '#2d5040' }}>
                      <span
                        className="absolute top-1 w-4 h-4 rounded-full transition-all"
                        style={{
                          background: 'white',
                          left: settingsForm[key] ? '26px' : '4px',
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom rating fields */}
            {settingsForm.show_ratings && (
              <div className="rounded-2xl p-6"
                style={{ background: '#1a2e22', border: '1px solid #2d5040' }}>
                <h2 className="font-display font-semibold text-white mb-1">
                  Custom rating fields
                </h2>
                <p className="text-chalk-muted text-xs mb-5">
                  Define what students rate — 1 to 4 fields
                </p>
                <div className="space-y-3 mb-4">
                  {settingsForm.rating_fields.map((field, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        value={field}
                        onChange={e => updateRatingField(index, e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl text-chalk-text text-sm outline-none"
                        style={{ background: '#111c16', border: '1px solid #2d5040', color: '#e8f5ee' }}
                        placeholder="Field name"
                        maxLength={20}
                      />
                      <button
                        onClick={() => removeRatingField(index)}
                        className="px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
                        style={{
                          background: '#111c16',
                          color: '#f87171',
                          border: '1px solid #2d5040'
                        }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {settingsForm.rating_fields.length < 4 && (
                  <button
                    onClick={addRatingField}
                    className="w-full py-2 rounded-xl text-sm font-display transition-all hover:opacity-80"
                    style={{
                      background: '#111c16',
                      color: '#4ade80',
                      border: '1px dashed #2d5040'
                    }}>
                    + Add field
                  </button>
                )}
              </div>
            )}

            <button
              onClick={saveSettings}
              className="w-full py-4 rounded-xl font-display font-bold text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#4ade80', color: '#111c16' }}>
              Save Settings
            </button>

          </div>
        )}

      </div>
    </div>
  )
}