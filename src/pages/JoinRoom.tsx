"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase/config"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-hot-toast"
import { getAuth } from "firebase/auth"
import { ArrowLeft, Users, LogIn, Hash } from "lucide-react"

const JoinRoom = () => {
  const [nickname, setNickname] = useState("")
  const [roomId, setRoomId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const { signIn, currentUser, nickname: authNickname, updateNickname } = useAuth()
  const navigate = useNavigate()
  const auth = getAuth()
  const location = useLocation()

  // URL'den roomId parametresini al
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const roomIdParam = searchParams.get("roomId")

    if (roomIdParam) {
      setRoomId(roomIdParam.toUpperCase())
    }
  }, [location])

  // Kullanıcı adını AuthContext'ten al
  useEffect(() => {
    if (authNickname) {
      setNickname(authNickname)
    }
  }, [authNickname])

  // URL'den gelen roomId ve kullanıcı bilgileri hazır olduğunda otomatik giriş yap
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const roomIdParam = searchParams.get("roomId")

    // Eğer URL'den roomId geldiyse ve kullanıcı bilgileri hazırsa otomatik giriş yap
    if (roomIdParam && currentUser && nickname && !isJoining) {
      handleJoinRoom(new Event("submit") as unknown as React.FormEvent)
    }
  }, [roomId, currentUser, nickname, location.search])

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) {
      toast.error("Lütfen bir takma ad girin")
      return
    }
    if (!roomId.trim()) {
      toast.error("Lütfen bir oda kodu girin")
      return
    }

    setIsJoining(true)
    try {
      // Önce kullanıcının kimlik doğrulamasını yapalım
      // Kullanıcı giriş yapmamışsa, önce giriş yaptıralım
      if (!currentUser) {
        await signIn(nickname)
      } else if (nickname !== authNickname) {
        // Kullanıcı giriş yapmış ve nickname değişmişse güncelle
        await updateNickname(nickname)
      }

      // Şimdi oda kontrollerini yapalım
      const roomRef = doc(db, "rooms", roomId)
      const roomSnap = await getDoc(roomRef)

      if (!roomSnap.exists()) {
        toast.error("Oda bulunamadı")
        setIsJoining(false)
        return
      }

      const roomData = roomSnap.data()

      if (roomData.status === "playing") {
        toast.error("Bu oda şu anda oyunda")
        setIsJoining(false)
        return
      }

      if (roomData.players.length >= roomData.maxPlayers) {
        toast.error("Oda dolu")
        setIsJoining(false)
        return
      }

      // Kullanıcı zaten odada mı kontrol et
      const isPlayerInRoom = roomData.players.some((player: any) => player.id === auth.currentUser?.uid)

      // Odada aynı isimde başka bir oyuncu var mı kontrol et
      const isNicknameExists = roomData.players.some(
        (player: any) =>
          player.id !== auth.currentUser?.uid && player.nickname.toLowerCase() === nickname.toLowerCase(),
      )

      if (isNicknameExists) {
        toast.error("Bu takma ad odada başka bir oyuncu tarafından kullanılıyor")
        setIsJoining(false)
        return
      }

      if (isPlayerInRoom) {
        // Kullanıcı zaten odada, nickname'i güncelle
        const updatedPlayers = roomData.players.map((player: any) => {
          if (player.id === auth.currentUser?.uid) {
            return { ...player, nickname }
          }
          return player
        })

        await updateDoc(roomRef, {
          players: updatedPlayers,
          lastActivity: serverTimestamp(),
        })
      } else {
        // Kullanıcı odada değil, ekle
        await updateDoc(roomRef, {
          players: [
            ...roomData.players,
            {
              id: auth.currentUser?.uid,
              nickname,
              isHost: false,
              score: 0,
            },
          ],
          lastActivity: serverTimestamp(),
        })
      }

      navigate(`/room/${roomId}`)
    } catch (error) {
      console.error("Odaya katılırken hata:", error)
      toast.error("Odaya katılırken bir hata oluştu")
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      <div className="w-full max-w-md">
        <div className="glass-card shadow-xl p-8 backdrop-blur-lg animate-fade-in">
          <div className="flex items-center justify-center mb-8">
            <img
              src="/owly-logo.svg"
              alt="Owly Logo"
              className="w-14 h-14 mr-3 drop-shadow-lg"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
              Odaya Katıl
            </h1>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-5">
            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4 inline mr-2" />
                Takma Adınız
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="form-control focus:ring-emerald-500 focus:border-emerald-500 shadow-md"
                placeholder="Takma adınızı girin"
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                <Hash className="w-4 h-4 inline mr-2" />
                Oda Kodu
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="form-control focus:ring-emerald-500 focus:border-emerald-500 shadow-md uppercase"
                placeholder="Oda kodunu girin"
                maxLength={6}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Geri</span>
              </button>
              <button
                type="submit"
                disabled={isJoining || !nickname || !roomId}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-3 px-4 rounded-full transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <LogIn className="w-5 h-5" />
                {isJoining ? "Katılıyor..." : "Katıl"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default JoinRoom

