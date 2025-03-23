"use client"

import type React from "react"

import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Yükleniyor...</div>
  }

  if (!currentUser) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

export default ProtectedRoute

