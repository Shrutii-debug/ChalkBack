import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1e3828',
          color: '#e8f5ee',
          border: '1px solid #2d5040',
          fontFamily: 'DM Sans, sans-serif',
        },
        success: { iconTheme: { primary: '#4ade80', secondary: '#1e3828' } },
        error: { iconTheme: { primary: '#f87171', secondary: '#1e3828' } },
      }}
    />
  </StrictMode>
)
