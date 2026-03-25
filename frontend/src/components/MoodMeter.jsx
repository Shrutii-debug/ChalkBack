const MOODS = [
  { key: '1', emoji: '😕', label: 'Confused', color: '#f87171' },
  { key: '2', emoji: '😐', label: 'Okay',     color: '#fb923c' },
  { key: '3', emoji: '😊', label: 'Good',     color: '#facc15' },
  { key: '4', emoji: '🔥', label: 'Amazing',  color: '#4ade80' },
]

export default function MoodMeter({ moodCounts = {}, total = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {MOODS.map(m => {
        const count = moodCounts[m.key] || 0
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0

        return (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{m.emoji}</span>
            <span style={{ fontSize: '13px', color: '#6b9e7e', width: '64px' }}>{m.label}</span>
            <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#1e3828', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: m.color,
                borderRadius: '4px',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <span style={{ fontSize: '13px', color: '#6b9e7e', width: '36px', textAlign: 'right' }}>
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}