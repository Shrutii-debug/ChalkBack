export default function StarRating({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <span style={{ fontSize: '13px', color: '#6b9e7e' }}>{label}</span>
      )}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange && onChange(star)}
            style={{
              background: 'none',
              border: 'none',
              cursor: onChange ? 'pointer' : 'default',
              padding: '2px',
              fontSize: '22px',
              lineHeight: 1,
              transition: 'transform 0.1s',
              transform: star <= value ? 'scale(1.1)' : 'scale(1)',
              filter: star <= value ? 'none' : 'grayscale(1) opacity(0.3)',
            }}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  )
}