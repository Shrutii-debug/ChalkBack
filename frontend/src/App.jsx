import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FeedbackForm from './pages/FeedbackForm'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import QAPublic from './pages/QAPublic'
import PrivateRoute from './components/PrivateRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/f/:slug" element={<FeedbackForm />} />
        <Route path="/f/:slug/qa" element={<QAPublic />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}