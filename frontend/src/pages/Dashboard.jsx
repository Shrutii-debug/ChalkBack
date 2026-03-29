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
        api.get('/dashboard/me'), api.get('/dashboard/summary'),
        api.get('/dashboard/wordcloud'), api.get('/dashboard/feedback'),
        api.get('/dashboard/qa'), api.get('/dashboard/settings'),
      ])
      setTeacher(me.data); setSummary(sum.data)
      setWordcloud(wc.data || []); setFeedbacks(fb.data || [])
      setQuestions(qa.data || []); setSettings(set.data)
    } catch { navigate('/login') }
  }, [navigate])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [fetchAll])

  useEffect(() => {
    if (settings && !settingsForm) {
      setSettingsForm({
        show_mood: settings.show_mood, show_poll: settings.show_poll,
        show_ratings: settings.show_ratings, show_feedback_text: settings.show_feedback_text,
        show_one_thing: settings.show_one_thing, show_qa: settings.show_qa,
        rating_fields: [...(settings.rating_fields || ['Clarity', 'Engagement', 'Pace', 'Helpfulness'])],
      })
    }
  }, [settings, settingsForm])

  const logout = async () => { await api.post('/auth/logout'); navigate('/login') }

  const submitAnswer = async (qId) => {
    const text = answerDraft[qId]?.trim()
    if (!text) return toast.error('Answer cannot be empty')
    try {
      const r = await api.post(`/dashboard/qa/${qId}/answer`, { answer_text: text })
      setQuestions(qs => qs.map(q => q.id === qId ? r.data : q))
      setAnswerDraft(d => ({ ...d, [qId]: '' }))
      toast.success('Answer posted!')
    } catch { toast.error('Failed to post answer') }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${teacher?.slug}`)
    toast.success('Link copied!')
  }

  const saveSettings = async () => {
    if (!settingsForm.rating_fields.length) return toast.error('Add at least one rating field')
    try {
      await api.post('/dashboard/settings', settingsForm)
      setSettings({ ...settings, ...settingsForm })
      toast.success('Settings saved!')
    } catch { toast.error('Failed to save settings') }
  }

  const addRatingField = () => {
    if (settingsForm.rating_fields.length >= 4) return toast.error('Maximum 4 fields allowed')
    setSettingsForm(f => ({ ...f, rating_fields: [...f.rating_fields, 'New Field'] }))
  }

  const removeRatingField = (index) => {
    if (settingsForm.rating_fields.length <= 1) return toast.error('Minimum 1 field required')
    setSettingsForm(f => ({ ...f, rating_fields: f.rating_fields.filter((_, i) => i !== index) }))
  }

  const updateRatingField = (index, value) => {
    setSettingsForm(f => ({ ...f, rating_fields: f.rating_fields.map((field, i) => i === index ? value : field) }))
  }

  if (!teacher || !summary || !settings) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090f0b' }}>
      <p style={{ fontFamily: 'Cabinet Grotesk, sans-serif', color: '#3d6b4f', fontSize: 16 }}>
        Loading dashboard…
      </p>
    </div>
  )

  const radarData = Object.entries(summary.avg_ratings || {}).map(([subject, value]) => ({ subject, value: +value.toFixed(1) }))
  const pollData = Object.entries(summary.poll_counts || {}).map(([name, value]) => ({ name, value }))
  const unanswered = questions.filter(q => !q.is_answered)
  const answered = questions.filter(q => q.is_answered)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800;900&family=Instrument+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }

        .db-root {
          min-height: 100vh;
          background: #090f0b;
          font-family: 'Instrument Sans', sans-serif;
          position: relative;
        }

        .db-root::before {
          content: '';
          position: fixed; inset: 0;
          background:
            radial-gradient(ellipse 80% 40% at 100% 0%, rgba(74,222,128,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 0% 100%, rgba(74,222,128,0.03) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .db-nav {
          position: sticky; top: 0; z-index: 50;
          width: 100%;
          padding: 0 16px;
          height: 60px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(9,15,11,0.85);
          border-bottom: 1px solid rgba(45,80,64,0.5);
          backdrop-filter: blur(16px);
          overflow: hidden;
        }

        .db-nav-logo {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
          min-width: 0;
        }

        .db-nav-logo-text {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800; font-size: 17px; color: #f0faf4;
          white-space: nowrap;
        }

        .db-nav-spacer { flex: 1; min-width: 0; }

        .db-copy-btn {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 6px;
          padding: 7px 10px;
          border-radius: 10px;
          background: rgba(74,222,128,0.08);
          border: 1px solid rgba(74,222,128,0.2);
          color: #4ade80;
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 700; font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .db-copy-btn:hover {
          background: rgba(74,222,128,0.14);
          border-color: rgba(74,222,128,0.4);
        }

        /* Hide label by default, show on wider screens */
        .db-copy-label { display: none; }
        @media (min-width: 420px) { .db-copy-label { display: inline; } }

        .db-signout {
          flex-shrink: 0;
          background: none; border: none;
          color: #3d6b4f; font-size: 13px;
          cursor: pointer;
          font-family: 'Instrument Sans', sans-serif;
          transition: color 0.2s; padding: 4px;
          white-space: nowrap;
        }
        .db-signout:hover { color: #e8f5ee; }

        .db-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 28px 16px 60px;
          position: relative; z-index: 1;
        }

        .db-welcome { margin-bottom: 28px; }

        .db-welcome h1 {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 900;
          font-size: clamp(22px, 5vw, 34px);
          color: #f0faf4; margin: 0 0 4px;
          letter-spacing: -0.5px; word-break: break-word;
        }

        .db-welcome p { font-size: 13px; color: #3d6b4f; margin: 0; }
        .db-welcome-slug { color: #4ade80; font-size: 12px; }

        .db-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px; margin-bottom: 24px;
        }

        @media (min-width: 640px) { .db-stats { grid-template-columns: repeat(4, 1fr); } }

        .db-stat {
          background: rgba(20,38,26,0.7);
          border: 1px solid rgba(45,80,64,0.6);
          border-radius: 16px; padding: 16px;
          transition: border-color 0.2s;
          min-width: 0;
        }
        .db-stat:hover { border-color: rgba(74,222,128,0.25); }

        /* Tighter padding on very small screens */
        @media (max-width: 380px) {
          .db-stat { padding: 12px; }
          .db-stat-value { font-size: 24px !important; }
        }

        .db-stat-label {
          font-size: 11px; color: #3d6b4f; margin: 0 0 6px;
          font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .db-stat-value {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 900; font-size: 30px; color: #f0faf4; margin: 0; line-height: 1;
        }

        .db-tabs {
          display: flex; gap: 4px; margin-bottom: 24px;
          padding: 4px;
          background: rgba(20,38,26,0.6);
          border: 1px solid rgba(45,80,64,0.5);
          border-radius: 14px;
          overflow-x: auto; scrollbar-width: none;
        }

        .db-tab {
          flex-shrink: 0; padding: 8px 16px;
          border-radius: 10px; border: 1px solid transparent;
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 700; font-size: 13px; cursor: pointer;
          transition: all 0.18s; display: flex; align-items: center; gap: 6px;
          background: transparent; color: #4d7a5e;
        }
        .db-tab:hover { color: #a8d5b5; }
        .db-tab.active {
          background: rgba(9,15,11,0.9);
          border-color: rgba(74,222,128,0.2);
          color: #f0faf4; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .db-tab-badge {
          padding: 1px 7px; border-radius: 100px;
          background: #f4c430; color: #1a1000;
          font-size: 11px; font-weight: 800;
        }

        .db-card {
          background: rgba(20,38,26,0.6);
          border: 1px solid rgba(45,80,64,0.6);
          border-radius: 20px; padding: 24px;
          transition: border-color 0.2s;
        }
        .db-card:hover { border-color: rgba(74,222,128,0.15); }

        .db-card-title {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800; font-size: 15px; color: #e8f5ee; margin: 0 0 4px;
        }
        .db-card-sub { font-size: 12px; color: #3d6b4f; margin: 0 0 16px; }

        .db-grid-2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) { .db-grid-2 { grid-template-columns: repeat(2, 1fr); } }

        .db-space { display: flex; flex-direction: column; gap: 12px; }

        .fb-entry {
          background: rgba(20,38,26,0.6);
          border: 1px solid rgba(45,80,64,0.5);
          border-radius: 16px; padding: 18px;
          transition: border-color 0.2s;
        }
        .fb-entry:hover { border-color: rgba(74,222,128,0.2); }

        .fb-entry-header {
          display: flex; align-items: center;
          justify-content: space-between; gap: 8px;
          margin-bottom: 12px; flex-wrap: wrap;
        }

        .fb-entry-date { font-size: 11px; color: #3d6b4f; flex-shrink: 0; }

        .fb-poll-chip {
          padding: 3px 10px; border-radius: 100px;
          background: rgba(9,15,11,0.8); border: 1px solid #1e3828;
          color: #4d7a5e; font-size: 11px; font-weight: 600;
          font-family: 'Cabinet Grotesk', sans-serif;
        }

        .fb-ratings-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 8px; margin-bottom: 10px;
        }
        @media (min-width: 480px) { .fb-ratings-grid { grid-template-columns: repeat(4, 1fr); } }

        .fb-rating-chip { text-align: center; padding: 8px; border-radius: 10px; background: rgba(9,15,11,0.8); }
        .fb-rating-chip-label { font-size: 10px; color: #3d6b4f; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fb-rating-chip-val { font-family: 'Cabinet Grotesk', sans-serif; font-weight: 800; font-size: 16px; color: #f0faf4; }
        .fb-text { font-size: 13px; color: #8ab89a; line-height: 1.6; margin-bottom: 8px; }
        .fb-onetea { display: flex; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(244,196,48,0.05); border: 1px solid rgba(244,196,48,0.15); margin-top: 8px; }
        .fb-onetea-star { color: #f4c430; font-size: 13px; flex-shrink: 0; margin-top: 1px; }
        .fb-onetea-text { font-size: 13px; color: #c8b060; line-height: 1.5; }

        .qa-section-title {
          font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800; font-size: 15px; color: #e8f5ee;
          margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
        }

        .qa-card { background: rgba(20,38,26,0.6); border: 1px solid rgba(45,80,64,0.5); border-radius: 16px; padding: 18px; }
        .qa-q { display: flex; gap: 10px; margin-bottom: 14px; }
        .qa-q-text { font-size: 14px; color: #c8ddd0; line-height: 1.6; }

        .qa-answer-row { display: flex; flex-direction: column; gap: 8px; }
        @media (min-width: 480px) { .qa-answer-row { flex-direction: row; } }

        .qa-textarea {
          flex: 1; background: rgba(9,15,11,0.8);
          border: 1px solid #1e3828; border-radius: 10px;
          padding: 10px 14px; color: #e8f5ee; font-size: 13px;
          font-family: 'Instrument Sans', sans-serif;
          outline: none; resize: none; transition: border-color 0.2s;
        }
        .qa-textarea:focus { border-color: rgba(74,222,128,0.4); box-shadow: 0 0 0 3px rgba(74,222,128,0.07); }
        .qa-textarea::placeholder { color: #2d5040; }

        .qa-post-btn {
          padding: 10px 20px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #060e09; font-family: 'Cabinet Grotesk', sans-serif;
          font-weight: 800; font-size: 13px; cursor: pointer;
          transition: all 0.2s; align-self: flex-end; flex-shrink: 0;
        }
        .qa-post-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(74,222,128,0.25); }

        .qa-answered-card { background: rgba(20,38,26,0.4); border: 1px solid rgba(45,80,64,0.3); border-radius: 16px; padding: 18px; opacity: 0.75; }
        .qa-answer-block { margin-left: 28px; padding-top: 12px; border-top: 1px solid rgba(45,80,64,0.4); display: flex; gap: 10px; }
        .qa-a-text { font-size: 13px; color: #4d7a5e; line-height: 1.6; }

        .snippet-item { display: flex; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(9,15,11,0.6); border: 1px solid rgba(45,80,64,0.4); }
        .snippet-arrow { color: #3d6b4f; flex-shrink: 0; margin-top: 2px; font-size: 13px; }
        .snippet-text { font-size: 13px; color: #8ab89a; line-height: 1.6; }

        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border-radius: 12px; background: rgba(9,15,11,0.6); border: 1px solid rgba(45,80,64,0.4); transition: border-color 0.2s; }
        .toggle-row:hover { border-color: rgba(74,222,128,0.2); }
        .toggle-label { font-family: 'Cabinet Grotesk', sans-serif; font-weight: 700; font-size: 14px; color: #c8ddd0; }
        .toggle-desc { font-size: 11px; color: #3d6b4f; margin-top: 2px; }
        .toggle-track { position: relative; width: 44px; height: 24px; border-radius: 100px; flex-shrink: 0; cursor: pointer; border: none; transition: background 0.2s; }
        .toggle-thumb { position: absolute; top: 4px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: left 0.2s; }

        .settings-save-btn { width: 100%; padding: 16px; border-radius: 14px; border: none; background: linear-gradient(135deg, #4ade80, #22c55e); color: #060e09; font-family: 'Cabinet Grotesk', sans-serif; font-weight: 900; font-size: 16px; cursor: pointer; transition: all 0.2s; }
        .settings-save-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(74,222,128,0.3); }

        .rating-field-row { display: flex; gap: 8px; align-items: center; }
        .rating-field-input { flex: 1; background: rgba(9,15,11,0.8); border: 1px solid #1e3828; border-radius: 10px; padding: 10px 14px; color: #e8f5ee; font-size: 14px; font-family: 'Instrument Sans', sans-serif; outline: none; transition: border-color 0.2s; }
        .rating-field-input:focus { border-color: rgba(74,222,128,0.4); box-shadow: 0 0 0 3px rgba(74,222,128,0.07); }
        .rating-remove-btn { padding: 10px 12px; border-radius: 10px; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.15); color: #f87171; font-size: 13px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .rating-remove-btn:hover { background: rgba(248,113,113,0.15); }
        .add-field-btn { width: 100%; padding: 10px; border-radius: 10px; cursor: pointer; background: transparent; border: 1px dashed rgba(74,222,128,0.25); color: #4ade80; font-size: 13px; font-family: 'Cabinet Grotesk', sans-serif; font-weight: 700; transition: all 0.2s; }
        .add-field-btn:hover { border-color: rgba(74,222,128,0.5); background: rgba(74,222,128,0.04); }

        .empty-state { text-align: center; padding: 60px 20px; }
        .empty-state-icon { font-size: 40px; margin-bottom: 12px; }
        .empty-state-text { font-size: 14px; color: #3d6b4f; }
      `}</style>

      <div className="db-root">
        <nav className="db-nav">
          <div className="db-nav-logo">
            <span style={{ fontSize: 18 }}>🍀</span>
            <span className="db-nav-logo-text">ChalkBack</span>
          </div>
          <div className="db-nav-spacer" />
          <button onClick={copyLink} className="db-copy-btn">
            <span>📋</span>
            <span className="db-copy-label">Copy student link</span>
          </button>
          <button onClick={logout} className="db-signout">Sign out</button>
        </nav>

        <div className="db-content">
          <div className="db-welcome">
            <h1>Hey, {teacher.name} 👋</h1>
            <p>
              {teacher.subject && `${teacher.subject} · `}
              Your page: <span className="db-welcome-slug">/f/{teacher.slug}</span>
            </p>
          </div>

          <div className="db-stats">
            {[
              { label: 'Total Responses', value: summary.total_responses },
              { label: 'Rating Fields', value: settings.rating_fields?.length || 0 },
              { label: 'Questions Asked', value: questions.length },
              { label: 'Unanswered', value: unanswered.length },
            ].map(c => (
              <div key={c.label} className="db-stat">
                <p className="db-stat-label">{c.label}</p>
                <p className="db-stat-value">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="db-tabs">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`db-tab${tab === t ? ' active' : ''}`}>
                {t}
                {t === 'Q&A' && unanswered.length > 0 && (
                  <span className="db-tab-badge">{unanswered.length}</span>
                )}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="db-space">
              <div className="db-grid-2">
                <div className="db-card">
                  <p className="db-card-title">Mood meter</p>
                  <MoodMeter moodCounts={summary.mood_counts} />
                </div>
                <div className="db-card">
                  <p className="db-card-title">Class pace poll</p>
                  {pollData.length === 0
                    ? <p className="db-card-sub" style={{ marginTop: 8 }}>No poll responses yet.</p>
                    : (
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={pollData} barSize={32}>
                          <XAxis dataKey="name" tick={{ fill: '#4d7a5e', fontSize: 12, fontFamily: 'Instrument Sans' }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip contentStyle={{ background: '#0e1a12', border: '1px solid #2d5040', borderRadius: 8, color: '#e8f5ee', fontSize: 12 }} cursor={{ fill: 'rgba(45,80,64,0.3)' }} />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {pollData.map((_, i) => <Cell key={i} fill={['#f87171', '#4ade80', '#fb923c'][i % 3]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </div>
              </div>

              <div className="db-card">
                <p className="db-card-title">Rating breakdown</p>
                {radarData.length === 0
                  ? <p className="db-card-sub" style={{ marginTop: 8 }}>No ratings yet.</p>
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(45,80,64,0.5)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#4d7a5e', fontSize: 12, fontFamily: 'Instrument Sans' }} />
                        <Radar dataKey="value" stroke="#4ade80" fill="#4ade80" fillOpacity={0.15} dot={{ fill: '#4ade80', r: 4 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
              </div>

              <div className="db-card">
                <p className="db-card-title">Word cloud</p>
                <p className="db-card-sub">Most repeated words from all feedback</p>
                <WordCloud words={wordcloud} />
              </div>

              {summary.one_thing_snippets?.length > 0 && (
                <div className="db-card" style={{ borderColor: 'rgba(244,196,48,0.15)' }}>
                  <p className="db-card-title"><span style={{ color: '#f4c430' }}>★ </span>One thing to improve</p>
                  <p className="db-card-sub">Anonymous student suggestions</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                    {summary.one_thing_snippets.map((s, i) => (
                      <div key={i} className="snippet-item">
                        <span className="snippet-arrow">→</span>
                        <p className="snippet-text">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'Feedback' && (
            <div className="db-space">
              {feedbacks.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <p className="empty-state-text">No feedback yet. Share your student link!</p>
                </div>
              )}
              {feedbacks.map(f => {
                const moodEmoji = ['', '😕', '😐', '😊', '🔥'][f.mood] || '—'
                const date = new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                let ratingsObj = {}
                try { ratingsObj = JSON.parse(f.ratings_json) } catch {}
                return (
                  <div key={f.id} className="fb-entry">
                    <div className="fb-entry-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 22 }}>{moodEmoji}</span>
                        {f.quick_poll_answer && <span className="fb-poll-chip">{f.quick_poll_answer}</span>}
                      </div>
                      <span className="fb-entry-date">{date}</span>
                    </div>
                    {Object.keys(ratingsObj).length > 0 && (
                      <div className="fb-ratings-grid">
                        {Object.entries(ratingsObj).map(([field, val]) => (
                          <div key={field} className="fb-rating-chip">
                            <span className="fb-rating-chip-label">{field}</span>
                            <span className="fb-rating-chip-val">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {f.feedback_text && <p className="fb-text">{f.feedback_text}</p>}
                    {f.one_thing_to_improve && (
                      <div className="fb-onetea">
                        <span className="fb-onetea-star">★</span>
                        <p className="fb-onetea-text">{f.one_thing_to_improve}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'Q&A' && (
            <div className="db-space">
              {unanswered.length > 0 && (
                <div>
                  <p className="qa-section-title">
                    Unanswered <span className="db-tab-badge">{unanswered.length}</span>
                  </p>
                  <div className="db-space">
                    {unanswered.map(q => (
                      <div key={q.id} className="qa-card">
                        <div className="qa-q">
                          <span style={{ fontSize: 18, flexShrink: 0 }}>🙋</span>
                          <p className="qa-q-text">{q.question_text}</p>
                        </div>
                        <div className="qa-answer-row">
                          <textarea rows={2} value={answerDraft[q.id] || ''} onChange={e => setAnswerDraft(d => ({ ...d, [q.id]: e.target.value }))} placeholder="Type your answer…" className="qa-textarea" />
                          <button onClick={() => submitAnswer(q.id)} className="qa-post-btn">Post</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {answered.length > 0 && (
                <div>
                  <p className="qa-section-title" style={{ color: '#4d7a5e' }}>Answered</p>
                  <div className="db-space">
                    {answered.map(q => (
                      <div key={q.id} className="qa-answered-card">
                        <div className="qa-q">
                          <span style={{ fontSize: 18, flexShrink: 0 }}>🙋</span>
                          <p className="qa-q-text">{q.question_text}</p>
                        </div>
                        <div className="qa-answer-block">
                          <span style={{ fontSize: 18, flexShrink: 0 }}>👨‍🏫</span>
                          <p className="qa-a-text">{q.answer_text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {questions.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <p className="empty-state-text">No questions yet from students.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'Settings' && settingsForm && (
            <div className="db-space">
              <div className="db-card">
                <p className="db-card-title">Form sections</p>
                <p className="db-card-sub">Choose what appears on your student feedback form</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'show_mood', label: 'Mood Picker', desc: 'Students pick 😕 😐 😊 🔥' },
                    { key: 'show_poll', label: 'Quick Poll', desc: 'Too fast / Just right / Too slow' },
                    { key: 'show_ratings', label: 'Star Ratings', desc: 'Custom rating fields with stars' },
                    { key: 'show_feedback_text', label: 'Open Feedback', desc: 'Free text for general thoughts' },
                    { key: 'show_one_thing', label: 'One Thing to Improve', desc: 'Required improvement suggestion' },
                    { key: 'show_qa', label: 'Anonymous Q&A', desc: 'Students ask questions anonymously' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="toggle-row">
                      <div>
                        <p className="toggle-label">{label}</p>
                        <p className="toggle-desc">{desc}</p>
                      </div>
                      <button onClick={() => setSettingsForm(f => ({ ...f, [key]: !f[key] }))} className="toggle-track" style={{ background: settingsForm[key] ? '#4ade80' : '#1e3828' }}>
                        <span className="toggle-thumb" style={{ left: settingsForm[key] ? '24px' : '4px' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {settingsForm.show_ratings && (
                <div className="db-card">
                  <p className="db-card-title">Custom rating fields</p>
                  <p className="db-card-sub">Define what students rate — 1 to 4 fields</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {settingsForm.rating_fields.map((field, index) => (
                      <div key={index} className="rating-field-row">
                        <input value={field} onChange={e => updateRatingField(index, e.target.value)} className="rating-field-input" placeholder="Field name" maxLength={20} />
                        <button onClick={() => removeRatingField(index)} className="rating-remove-btn">✕</button>
                      </div>
                    ))}
                  </div>
                  {settingsForm.rating_fields.length < 4 && (
                    <button onClick={addRatingField} className="add-field-btn">+ Add field</button>
                  )}
                </div>
              )}
              <button onClick={saveSettings} className="settings-save-btn">Save Settings</button>
            </div>
          )}

        </div>
      </div>
    </>
  )
}