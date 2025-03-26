"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc, onSnapshot, arrayUnion, serverTimestamp, deleteDoc } from "firebase/firestore"
import { ref, onValue, set, remove } from "firebase/database"
import { db, rtdb } from "../firebase/config"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-hot-toast"
import RoomSettings from "../components/RoomSettings"
import PlayerList from "../components/PlayerList"
import { fetchWordsFromCategories, getFallbackWords } from "../utils/wordService"
import { shuffleArray } from "../utils/arrayUtils"
import { Copy, Check, Edit, X, Users, Settings, LogOut, Play, Share2, AlertCircle, UserCircle } from "lucide-react"

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const { currentUser, nickname, updateNickname } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [newNickname, setNewNickname] = useState("")
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)

  // Kopyalama durumları için state'ler
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!roomId) return

    const roomRef = doc(db, "rooms", roomId)

    // Check if room exists and join if not already joined
    const checkAndJoinRoom = async () => {
      try {
        const roomSnap = await getDoc(roomRef)

        if (!roomSnap.exists()) {
          toast.error("Oda bulunamadı")
          navigate("/")
          return
        }

        const roomData = roomSnap.data()

        // Check if room is full
        if (roomData.players.length >= roomData.maxPlayers) {
          const isPlayerInRoom = roomData.players.some((player: any) => player.id === currentUser?.uid)
          if (!isPlayerInRoom) {
            toast.error("Oda dolu")
            navigate("/")
            return
          }
        }

        // Join room if not already joined
        const isPlayerInRoom = roomData.players.some((player: any) => player.id === currentUser?.uid)
        if (!isPlayerInRoom) {
          setIsJoining(true)
          await updateDoc(roomRef, {
            players: arrayUnion({
              id: currentUser?.uid,
              nickname,
              isHost: false,
              score: 0,
            }),
            lastActivity: serverTimestamp(),
          })
          setIsJoining(false)
        } else {
          // Kullanıcı zaten odada, nickname'i güncelle
          const updatedPlayers = roomData.players.map((player: any) => {
            if (player.id === currentUser?.uid) {
              return { ...player, nickname }
            }
            return player
          })

          // Eğer nickname değiştiyse güncelle
          if (updatedPlayers.some((player: any) => player.id === currentUser?.uid && player.nickname !== nickname)) {
            await updateDoc(roomRef, {
              players: updatedPlayers,
              lastActivity: serverTimestamp(),
            })

            // Eğer kullanıcı oda sahibiyse, hostNickname'i de güncelle
            if (roomData.host === currentUser?.uid) {
              await updateDoc(roomRef, {
                hostNickname: nickname,
              })
            }
          }
        }
      } catch (error) {
        console.error("Oda kontrol edilirken hata:", error)
        toast.error("Bir hata oluştu")
        navigate("/")
      }
    }

    checkAndJoinRoom()

    // Listen for room updates
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const roomData = doc.data()
        setRoom(roomData)
        setLoading(false)

        // If game started, navigate to game page
        if (roomData.status === "playing") {
          navigate(`/game/${roomId}`)
        }
      } else {
        toast.error("Oda silindi")
        navigate("/")
      }
    })

    // Atılan oyuncuları dinle
    const kickedPlayersRef = ref(rtdb, `kickedPlayers/${roomId}/${currentUser?.uid}`)
    const kickedListener = onValue(kickedPlayersRef, (snapshot) => {
      if (snapshot.exists()) {
        // Kullanıcı atıldı, ana sayfaya yönlendir
        toast.error("Odadan atıldınız")
        navigate("/")

        // Referansı temizle
        remove(kickedPlayersRef)
      }
    })

    // Update last activity periodically
    const activityInterval = setInterval(async () => {
      try {
        await updateDoc(roomRef, {
          lastActivity: serverTimestamp(),
        })
      } catch (error) {
        console.error("Son aktivite güncellenirken hata:", error)
      }
    }, 60000) // Update every minute

    return () => {
      unsubscribe()
      kickedListener()
      clearInterval(activityInterval)
    }
  }, [roomId, currentUser, nickname, navigate])

  // Nickname değiştirme işlemini başlat
  const handleEditNickname = () => {
    setNewNickname(nickname)
    setIsEditingNickname(true)
  }

  // Nickname değiştirme işlemini iptal et
  const handleCancelEditNickname = () => {
    setIsEditingNickname(false)
    setNewNickname("")
  }

  // Yeni nickname'i kaydet
  const handleSaveNickname = async () => {
    if (!newNickname.trim()) {
      toast.error("Lütfen geçerli bir takma ad girin")
      return
    }

    if (newNickname === nickname) {
      setIsEditingNickname(false)
      return
    }

    // Odada aynı isimde başka bir oyuncu var mı kontrol et
    if (room && room.players) {
      const isNicknameExists = room.players.some(
        (player: any) => player.id !== currentUser?.uid && player.nickname.toLowerCase() === newNickname.toLowerCase(),
      )

      if (isNicknameExists) {
        toast.error("Bu takma ad odada başka bir oyuncu tarafından kullanılıyor")
        return
      }
    }

    setIsUpdatingNickname(true)
    try {
      // AuthContext üzerinden nickname'i güncelle
      await updateNickname(newNickname)

      // Eğer updateNickname başarılı olduysa (blacklist kontrolünden geçtiyse)
      // ve nickname değiştiyse, odadaki oyuncu listesini güncelle
      if (nickname !== newNickname) {
        // Odadaki oyuncu listesini güncelle
        if (room && roomId) {
          const roomRef = doc(db, "rooms", roomId)
          const updatedPlayers = room.players.map((player: any) => {
            if (player.id === currentUser?.uid) {
              return { ...player, nickname: newNickname }
            }
            return player
          })

          await updateDoc(roomRef, {
            players: updatedPlayers,
            lastActivity: serverTimestamp(),
          })

          // Eğer kullanıcı oda sahibiyse, hostNickname'i de güncelle
          if (room.host === currentUser?.uid) {
            await updateDoc(roomRef, {
              hostNickname: newNickname,
            })
          }
        }

        setIsEditingNickname(false)
      }
    } catch (error) {
      console.error("Takma ad güncellenirken hata:", error)
      toast.error("Takma ad güncellenirken bir hata oluştu")
    } finally {
      setIsUpdatingNickname(false)
    }
  }

  // Oda kodunu kopyalama fonksiyonu
  const copyRoomId = () => {
    if (!roomId) return

    navigator.clipboard
      .writeText(roomId)
      .then(() => {
        setCodeCopied(true)
        toast.success("Oda kodu kopyalandı!")

        // 2 saniye sonra ikonu sıfırla
        setTimeout(() => {
          setCodeCopied(false)
        }, 2000)
      })
      .catch(() => {
        toast.error("Kopyalama başarısız oldu")
      })
  }

  // Oda linkini kopyalama fonksiyonu
  const copyRoomLink = () => {
    if (!roomId) return

    // Tam URL'yi oluştur
    const roomLink = `${window.location.origin}/join-room?roomId=${roomId}`

    navigator.clipboard
      .writeText(roomLink)
      .then(() => {
        setLinkCopied(true)
        toast.success("Oda linki kopyalandı!")

        // 2 saniye sonra ikonu sıfırla
        setTimeout(() => {
          setLinkCopied(false)
        }, 2000)
      })
      .catch(() => {
        toast.error("Link kopyalama başarısız oldu")
      })
  }

  // Oyuncu atma fonksiyonu
  const handleKickPlayer = async (playerId: string) => {
    if (!room || !roomId || !currentUser || room.host !== currentUser.uid) return

    try {
      const roomRef = doc(db, "rooms", roomId)

      // Atılacak oyuncuyu bul
      const playerToKick = room.players.find((p: any) => p.id === playerId)

      if (!playerToKick) {
        toast.error("Oyuncu bulunamadı")
        return
      }

      // Oyuncuyu listeden çıkar
      const updatedPlayers = room.players.filter((p: any) => p.id !== playerId)

      await updateDoc(roomRef, {
        players: updatedPlayers,
        lastActivity: serverTimestamp(),
      })

      // Atılan oyuncuyu Realtime Database'e kaydet
      const kickedPlayerRef = ref(rtdb, `kickedPlayers/${roomId}/${playerId}`)
      await set(kickedPlayerRef, {
        kickedAt: Date.now(),
        kickedBy: currentUser.uid,
      })

      toast.success(`${playerToKick.nickname} odadan atıldı`)
    } catch (error) {
      console.error("Oyuncu atılırken hata:", error)
      toast.error("Oyuncu atılırken bir hata oluştu")
    }
  }

  const startGame = async () => {
    if (!room || !roomId) return

    try {
      const roomRef = doc(db, "rooms", roomId)

      // Generate words based on settings
      let words = []
      if (room.settings.wordSource === "categories") {
        try {
          words = await fetchWordsFromCategories(room.settings.selectedCategories, room.settings.wordCount)

          // Eğer kelime bulunamazsa yedek kelimeleri kullan
          if (!words || words.length === 0) {
            console.log("Kategorilerden kelime bulunamadı, yedek kelimeler kullanılıyor")
            words = getFallbackWords(room.settings.wordCount)
          }
        } catch (error) {
          console.error("Kelimeler getirilirken hata:", error)
          words = getFallbackWords(room.settings.wordCount)
        }
      } else {
        // Özel kelimeler
        if (room.settings.customWords && room.settings.customWords.length > 0) {
          words = shuffleArray([...room.settings.customWords]).slice(0, room.settings.wordCount)
        } else {
          // Özel kelime yoksa yedek kelimeleri kullan
          words = getFallbackWords(room.settings.wordCount)
        }
      }

      // Kelime sayısını kontrol et
      if (words.length === 0) {
        toast.error("Kelime bulunamadı!")
        return
      }

      console.log("Oyun başlatılıyor, kelimeler:", words)

      await updateDoc(roomRef, {
        status: "playing",
        currentRound: 0,
        words,
        gameStartTime: serverTimestamp(),
        lastActivity: serverTimestamp(),
      })

      navigate(`/game/${roomId}`)
    } catch (error) {
      console.error("Oyun başlatılırken hata:", error)
      toast.error("Oyun başlatılırken bir hata oluştu")
    }
  }

  const leaveRoom = async () => {
    if (!room || !roomId || !currentUser) return

    try {
      const roomRef = doc(db, "rooms", roomId)
      const isHost = room.players.find((p: any) => p.id === currentUser.uid)?.isHost

      if (isHost) {
        // If host leaves, delete room or transfer host role
        if (room.players.length > 1) {
          const newPlayers = room.players.filter((p: any) => p.id !== currentUser.uid)
          newPlayers[0].isHost = true

          await updateDoc(roomRef, {
            players: newPlayers,
            host: newPlayers[0].id,
            hostNickname: newPlayers[0].nickname,
            lastActivity: serverTimestamp(),
          })
        } else {
          // Delete room if host is the only player
          await deleteDoc(roomRef)
        }
      } else {
        // If not host, just remove player
        const newPlayers = room.players.filter((p: any) => p.id !== currentUser.uid)
        await updateDoc(roomRef, {
          players: newPlayers,
          lastActivity: serverTimestamp(),
        })
      }

      navigate("/")
    } catch (error) {
      console.error("Odadan çıkılırken hata:", error)
      toast.error("Odadan çıkılırken bir hata oluştu")
    }
  }

  const isHost = room?.host === currentUser?.uid

  if (loading || isJoining) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
        <div className="animate-pulse flex flex-col items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-3xl shadow-lg">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <div className="text-2xl font-medium text-indigo-700 dark:text-indigo-300">Yükleniyor...</div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Oda bilgileri alınıyor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      <div className="w-full max-w-5xl animate-fade-in">
        <div className="glass-card shadow-xl p-6 md:p-8 backdrop-blur-lg border border-white/20 dark:border-gray-700/30">
          {/* Oda Başlığı ve Kontroller */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              {/* Başlık kısmını güncelleyelim */}
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/owly-logo.svg"
                  alt="Owly Logo"
                  className="w-10 h-10 drop-shadow-lg"
                  style={{ animation: "float 3s ease-in-out infinite" }}
                />
                <h1 className="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">
                  Oda: {roomId}
                </h1>
                <button
                  onClick={copyRoomId}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors transform hover:scale-110 active:scale-95"
                  title="Oda kodunu kopyala"
                >
                  {codeCopied ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <p className="text-sm">
                  Oda Sahibi: <span className="font-medium">{room.hostNickname}</span>
                </p>
              </div>
              <button
                onClick={copyRoomLink}
                className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline group"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Link kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 group-hover:animate-pulse" />
                    <span>Davet linki kopyala</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-3 self-end md:self-auto">
              {isHost && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="btn btn-outline flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
                >
                  <Settings className="w-4 h-4" />
                  <span>{showSettings ? "Ayarları Kapat" : "Ayarlar"}</span>
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="btn btn-danger flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Odadan Çık</span>
              </button>
            </div>
          </div>

          {/* Kullanıcının kendi nickname'ini değiştirme bölümü - Daha belirgin hale getirildi */}
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-5 rounded-3xl mb-8 transition-all duration-300 hover:shadow-lg border-2 border-indigo-200 dark:border-indigo-700 relative">
            <div className="absolute -top-3 left-4 bg-indigo-100 dark:bg-indigo-800 px-3 py-1 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Oyuncu Bilgileri
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 dark:bg-indigo-800 p-3 rounded-full">
                  <UserCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Takma Adınız</h3>
                  {isEditingNickname ? (
                    <div className="flex items-center mt-1 w-full">
                      <input
                        type="text"
                        value={newNickname}
                        onChange={(e) => setNewNickname(e.target.value)}
                        className="form-control focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700"
                        placeholder="Yeni takma adınız"
                        disabled={isUpdatingNickname}
                        autoFocus
                        maxLength={20}
                      />
                      <div className="flex ml-2">
                        <button
                          onClick={handleSaveNickname}
                          disabled={isUpdatingNickname}
                          className="p-2 rounded-full text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition-colors transform hover:scale-110 active:scale-95"
                          title="Kaydet"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancelEditNickname}
                          disabled={isUpdatingNickname}
                          className="p-2 rounded-full text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 transition-colors transform hover:scale-110 active:scale-95"
                          title="İptal"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center mt-1">
                      <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{nickname}</p>
                      <button
                        onClick={handleEditNickname}
                        className="ml-3 p-2 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors transform hover:scale-110 active:scale-95 shadow-sm"
                        title="Takma adı değiştir"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:block text-sm text-gray-500 dark:text-gray-400">
                <p>Oyun başlamadan önce takma adınızı değiştirebilirsiniz</p>
              </div>
            </div>
          </div>

          {showSettings && isHost && roomId && <RoomSettings room={room} roomId={roomId} />}

          <PlayerList players={room.players} isHost={isHost} onKickPlayer={handleKickPlayer} />

          {isHost && (
            <div className="mt-10 text-center">
              <button
                onClick={startGame}
                disabled={room.players.length < 2}
                className={`btn btn-lg ${
                  room.players.length < 2
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl"
                } flex items-center gap-3 mx-auto px-8 py-4 rounded-full transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300`}
              >
                <Play className="w-6 h-6" />
                <span className="text-xl">Oyunu Başlat</span>
              </button>
              {room.players.length < 2 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-red-500 animate-pulse-once">
                  <AlertCircle className="w-5 h-5" />
                  <p>Oyunu başlatmak için en az 2 oyuncu gerekli</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Room

