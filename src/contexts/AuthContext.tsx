"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { onAuthStateChanged, signInAnonymously } from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db } from "../firebase/config"
import { toast } from "react-hot-toast"
import { isNicknameBlacklisted } from "../utils/blacklistCheck"

interface AuthContextType {
  currentUser: any
  nickname: string
  setNickname: (nickname: string) => void
  loading: boolean
  signIn: (nickname: string) => Promise<void>
  updateNickname: (nickname: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [nickname, setNickname] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname)
        }
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (nickname: string) => {
    try {
      // Blacklist kontrolü
      const isBlacklisted = await isNicknameBlacklisted(nickname)
      if (isBlacklisted) {
        toast.error("Bu kullanıcı adı kullanılamaz")
        return
      }

      const { user } = await signInAnonymously(auth)

      // Kullanıcı kimliği varsa devam et
      if (user && user.uid) {
        await setDoc(doc(db, "users", user.uid), {
          nickname,
          createdAt: new Date(),
        })
        setNickname(nickname)
      } else {
        throw new Error("Kullanıcı kimliği alınamadı")
      }
    } catch (error: any) {
      toast.error("Giriş yapılırken bir hata oluştu")
      console.error(error)
    }
  }

  // Kullanıcı adını güncelleme fonksiyonu
  const updateNickname = async (newNickname: string) => {
    if (!currentUser) return

    try {
      // Blacklist kontrolü
      const isBlacklisted = await isNicknameBlacklisted(newNickname)
      if (isBlacklisted) {
        toast.error("Bu kullanıcı adı kullanılamaz")
        return
      }

      // Firestore'daki kullanıcı belgesini güncelle
      await updateDoc(doc(db, "users", currentUser.uid), {
        nickname: newNickname,
      })

      // State'i güncelle
      setNickname(newNickname)

      toast.success("Kullanıcı adı güncellendi")
    } catch (error) {
      console.error("Kullanıcı adı güncellenirken hata:", error)
      toast.error("Kullanıcı adı güncellenirken bir hata oluştu")
    }
  }

  const value = {
    currentUser,
    nickname,
    setNickname,
    loading,
    signIn,
    updateNickname,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

