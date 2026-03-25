const COLORS = ['#4ade80', '#f4c430', '#60a5fa', '#fb923c', '#a78bfa', '#34d399', '#f472b6']

export default function WordCloud({ words = [] }) {
  if (!words || words.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px',
        color: '#4b7a5e',
        fontSize: '14px',
      }}>
        Not enough data yet — submit more feedback to see the word cloud
      </div>
    )
  }

  const max = Math.max(...words.map(w => w.count))
  const min = Math.min(...words.map(w => w.count))

  const fontSize = (count) => {
    if (max === min) return 18
    return Math.round(12 + ((count - min) / (max - min)) * 28)
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 14px',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 4px',
      lineHeight: 1.4,
    }}>
      {words.map((w, i) => (
        <span
          key={w.word}
          title={`"${w.word}" — appeared ${w.count} time${w.count !== 1 ? 's' : ''}`}
          style={{
            fontSize: `${fontSize(w.count)}px`,
            color: COLORS[i % COLORS.length],
            fontFamily: 'Syne, sans-serif',
            fontWeight: w.count === max ? 800 : 600,
            cursor: 'default',
            transition: 'opacity 0.2s',
            opacity: 0.9,
          }}
          onMouseEnter={e => e.target.style.opacity = '1'}
          onMouseLeave={e => e.target.style.opacity = '0.9'}
        >
          {w.word}
        </span>
      ))}
    </div>
  )
}