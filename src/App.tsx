"use client"

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import Home from "./pages/Home"
import CreateRoom from "./pages/CreateRoom"
import JoinRoom from "./pages/JoinRoom"
import Room from "./pages/Room"
import Game from "./pages/Game"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import { useEffect } from "react"

function App() {
  // Sayfa yüklendiğinde tema tercihini kontrol et
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.body.classList.add("dark-theme")
    } else {
      document.body.classList.remove("dark-theme")
    }
  }, [])

  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-bg-light)",
              color: "var(--color-text-dark)",
              borderRadius: "0.5rem",
              boxShadow: "var(--shadow-md)",
            },
            className: "dark-theme-bg-gray-800 dark-theme-text-gray-100",
          }}
        />
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 dark-theme-from-gray-900 dark-theme-to-gray-800 text-gray-900 dark-theme-text-gray-100 transition-colors duration-300">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/join-room" element={<JoinRoom />} />
            <Route
              path="/room/:roomId"
              element={
                <ProtectedRoute>
                  <Room />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/:roomId"
              element={
                <ProtectedRoute>
                  <Game />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

