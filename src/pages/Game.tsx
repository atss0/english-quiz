"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore"
import { ref, onValue, set, get, remove } from "firebase/database"
import { db, rtdb } from "../firebase/config"
import { useAuth } from "../contexts/AuthContext"
import { toast } from "react-hot-toast"
import ScoreBoard from "../components/ScoreBoard"
import { fetchWordsFromCategories, getFallbackWords } from "../utils/wordService"
import { shuffleArray } from "../utils/arrayUtils"
import { Clock, Users, LogOut, Send, SkipForward, Award, Home, Play, User, Check, Loader2 } from "lucide-react"

// Oyun içi bileşenler
interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
}

const AnswerInput = ({ value, onChange, onSubmit, disabled, autoFocus = true }: AnswerInputProps) => {
  const inputRef = useRef<any>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [autoFocus, disabled])

  const handleSubmit = (e: any) => {
    e?.preventDefault()
    if (!disabled && value.trim()) {
      onSubmit(value.trim())
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative mb-5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cevabınızı yazın..."
          disabled={disabled}
          className="w-full px-5 py-4 text-lg rounded-full border-2 border-indigo-300 dark:border-indigo-600 
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md
                    disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400
                    transition-all duration-300"
          aria-label="Cevabınızı yazın"
        />
        {value.trim() && !disabled && (
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors"
            aria-label="Cevabı Gönder"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </form>

      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-full text-lg
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                  shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
      >
        {disabled ? (
          <>
            <Check className="w-5 h-5" />
            <span>Cevap Gönderildi</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>Cevabı Gönder</span>
          </>
        )}
      </button>
    </div>
  )
}

const Game = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState<any>(null)
  const [currentWord, setCurrentWord] = useState<any>(null)
  const [answer, setAnswer] = useState("")
  const [timeLeft, setTimeLeft] = useState(0)
  const [showScoreboard, setShowScoreboard] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [answeredTime, setAnsweredTime] = useState<number | null>(null)
  const [roundResults, setRoundResults] = useState<any>(null)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null)
  // Cevaplayan oyuncu sayısını takip eden state
  const [answeredCount, setAnsweredCount] = useState<number>(0)

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const answerInputRef = useRef<HTMLInputElement>(null)
  const currentRoundRef = useRef<number>(-1)
  const allPlayersAnsweredRef = useRef<boolean>(false)
  const roomRef = useRef<any>(null)
  const answersRef = useRef<any>(null)

  // Room setup
  useEffect(() => {
    if (!roomId || !currentUser) return

    roomRef.current = doc(db, "rooms", roomId)
    answersRef.current = ref(rtdb, `rooms/${roomId}/answers`)

    // Check if room exists and if user is part of the room
    const checkRoom = async () => {
      try {
        const roomSnap = await getDoc(roomRef.current)

        if (!roomSnap.exists()) {
          toast.error("Oda bulunamadı")
          navigate("/")
          return
        }

        const roomData = roomSnap.data() as { players: { id: string }[]; host: string; status: string; words?: any[] }
        const isPlayerInRoom = roomData.players.some((player: any) => player.id === currentUser.uid)

        if (!isPlayerInRoom) {
          toast.error("Bu odanın bir üyesi değilsiniz")
          navigate("/")
          return
        }

        if (roomData.status !== "playing") {
          navigate(`/room/${roomId}`)
          return
        }

        // Kelime kontrolü ekleyelim
        if (!roomData.words || roomData.words.length === 0) {
          toast.error("Kelimeler bulunamadı, odaya dönülüyor")
          navigate(`/room/${roomId}`)
          return
        }
      } catch (error) {
        toast.error("Bir hata oluştu")
        navigate("/")
      }
    }

    checkRoom()

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
        await updateDoc(roomRef.current, {
          lastActivity: serverTimestamp(),
        })
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
    }, 60000) // Update every minute

    return () => {
      clearInterval(activityInterval)
      kickedListener()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }
  }, [roomId, currentUser, navigate])

  // Room listener
  useEffect(() => {
    if (!roomId || !currentUser || !roomRef.current) return

    const unsubscribe = onSnapshot(roomRef.current, (doc: any) => {
      if (doc.exists()) {
        const roomData = doc.data()
        setRoom(roomData)
        setLoading(false)

        if (roomData.status !== "playing") {
          if (roomData.status === "ended") {
            setGameEnded(true)
            setShowScoreboard(false)
          } else {
            navigate(`/room/${roomId}`)
          }
          return
        }

        // Set current word
        if (roomData.currentRound < roomData.words.length) {
          // Tur değiştiyse, skor tablosunu kapat ve cevaplayan sayısını sıfırla
          if (currentRoundRef.current !== roomData.currentRound) {
            setShowScoreboard(false)
            setRoundResults(null)
            setAnsweredTime(null)
            setAnswer("")
            setAutoAdvanceTimer(null)
            allPlayersAnsweredRef.current = false
            currentRoundRef.current = roomData.currentRound
            setAnsweredCount(0) // Cevaplayan sayısını sıfırla
          }

          const currentWordData = roomData.words[roomData.currentRound]
          setCurrentWord(currentWordData)

          // Kullanıcının cevap verip vermediğini kontrol et
          if (currentUser) {
            const userAnswerRef = ref(rtdb, `rooms/${roomId}/answers/${roomData.currentRound}/${currentUser.uid}`)
            get(userAnswerRef).then((snapshot) => {
              if (snapshot.exists()) {
                // Kullanıcı zaten cevap vermiş
                setAnsweredTime(snapshot.val().time)
              } else {
                // Kullanıcı henüz cevap vermemiş
                setAnsweredTime(null)
                setTimeLeft(roomData.settings.timePerWord)
              }
            })
          }

          if (answerInputRef.current) {
            answerInputRef.current.focus()
          }
        } else {
          // Game ended
          setGameEnded(true)
          setShowScoreboard(false)
        }
      } else {
        toast.error("Oda silindi")
        navigate("/")
      }
    })

    return () => {
      unsubscribe()
    }
  }, [roomId, currentUser, navigate])

  // Answers listener
  useEffect(() => {
    if (!roomId || !currentUser || !answersRef.current || !room) return

    const handleAnswers = (snapshot: any) => {
      const answers = snapshot.val() || {}

      // Mevcut tur için cevapları kontrol et
      if (answers[room.currentRound]) {
        const currentRoundAnswers = answers[room.currentRound]

        // Cevaplayan oyuncu sayısını güncelle
        const answeredPlayers = Object.keys(currentRoundAnswers).length
        setAnsweredCount(answeredPlayers)

        // Tüm oyuncuların cevap verip vermediğini kontrol et
        let allPlayersAnswered = true
        const playerResults = []

        for (const player of room.players) {
          const playerAnswer = currentRoundAnswers[player.id]
          if (!playerAnswer) {
            allPlayersAnswered = false
            break
          } else {
            // Puanı hesapla
            let roundScore = 0
            if (playerAnswer.correct) {
              const timeBonus = Math.max(room.settings.timePerWord - playerAnswer.time, 0)
              roundScore = 100 + timeBonus * 10
            }

            // Güncel toplam puanı hesapla (mevcut puan + bu turdaki puan)
            const updatedTotalScore = playerAnswer.correct ? (player.score || 0) + roundScore : player.score || 0

            playerResults.push({
              ...player,
              answer: playerAnswer.answer || "",
              isCorrect: playerAnswer.correct || false,
              time: playerAnswer.time || room.settings.timePerWord,
              roundScore: roundScore,
              updatedTotalScore: updatedTotalScore, // Güncel toplam puanı ekle
            })
          }
        }

        // Eğer tüm oyuncular cevap verdiyse ve skor tablosu gösterilmiyorsa
        if (allPlayersAnswered && !showScoreboard && !allPlayersAnsweredRef.current) {
          // Durumu güncelle
          allPlayersAnsweredRef.current = true

          // Tur sonuçlarını hazırla
          setRoundResults(playerResults)

          // Skor tablosunu göster
          setShowScoreboard(true)

          if (timerRef.current) {
            clearInterval(timerRef.current)
          }

          // Eğer ev sahibiyse, 10 saniye sonra sonraki tura geç
          if (room.host === currentUser.uid) {
            startAutoAdvanceTimer()
          }
        }
      }
    }

    const answersUnsubscribe = onValue(answersRef.current, handleAnswers)

    return () => {
      answersUnsubscribe()
    }
  }, [roomId, currentUser, room, showScoreboard])

  // Timer effect
  useEffect(() => {
    if (!room || !currentWord || showScoreboard || answeredTime !== null) return

    // Kullanıcı henüz cevap vermemiş, timer'ı başlat
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    setTimeLeft(room.settings.timePerWord)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }

          // Submit empty answer if not answered yet
          if (answeredTime === null) {
            submitAnswer("")
          }

          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [room, currentWord, showScoreboard, answeredTime])

  // Auto advance timer
  const startAutoAdvanceTimer = () => {
    // Otomatik geçiş için geri sayım başlat
    setAutoAdvanceTimer(10)

    // Önceki zamanlayıcıyı temizle
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }

    // Her saniye geri sayımı güncelle
    countdownRef.current = setInterval(() => {
      setAutoAdvanceTimer((prev) => {
        if (prev === null) return null
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          // Sonraki tura geç
          advanceToNextRound()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const submitAnswer = async (submittedAnswer: string) => {
    if (!room || !currentUser || !roomId || !currentWord || answeredTime !== null) return

    const answerTime = room.settings.timePerWord - timeLeft
    setAnsweredTime(answerTime)

    try {
      // Cevabın doğru olup olmadığını kontrol et
      const isCorrect = isAnswerCorrect(submittedAnswer, currentWord)

      // Save answer to realtime database
      const answerRef = ref(rtdb, `rooms/${roomId}/answers/${room.currentRound}/${currentUser.uid}`)
      await set(answerRef, {
        answer: submittedAnswer,
        time: answerTime,
        correct: isCorrect,
      })
    } catch (error) {
      toast.error("Cevap gönderilirken bir hata oluştu")
    }
  }

  const isAnswerCorrect = (answer: string, word: any) => {
    if (!answer.trim()) return false

    const normalizedAnswer = answer.trim().toLowerCase()
    const normalizedCorrect = word.isEnglish ? word.turkish.toLowerCase() : word.english.toLowerCase()

    return normalizedAnswer === normalizedCorrect
  }

  const advanceToNextRound = async () => {
    if (!room || !roomId) return

    try {
      const answersRef = ref(rtdb, `rooms/${roomId}/answers/${room.currentRound}`)
      const answersSnapshot = await get(answersRef)
      const answers = answersSnapshot.val() || {}

      // Calculate scores
      const updatedPlayers = room.players.map((player: any) => {
        const playerAnswer = answers[player.id]

        if (playerAnswer && playerAnswer.correct) {
          // Calculate score based on time - faster answers get more points
          const timeBonus = Math.max(room.settings.timePerWord - playerAnswer.time, 0)
          const roundScore = 100 + timeBonus * 10

          return {
            ...player,
            score: (player.score || 0) + roundScore,
          }
        }
        return player
      })

      // Yerel state'i de güncelle ki UI'da doğru puanlar gösterilsin
      setRoom((prevRoom: any) => ({
        ...prevRoom,
        players: updatedPlayers,
      }))

      const nextRound = room.currentRound + 1

      // Her durumda bir sonraki tura geç, son tur kontrolünü kaldırdık
      await updateDoc(roomRef.current, {
        currentRound: nextRound,
        players: updatedPlayers,
        lastActivity: serverTimestamp(),
      })
    } catch (error) {
      toast.error("Sonraki tura geçilirken bir hata oluştu")
    }
  }

  const showFinalScores = async () => {
    if (!room || !roomId || room.host !== currentUser?.uid) return

    try {
      // Oyunu bitir ve puanları göster
      await updateDoc(roomRef.current, {
        status: "ended",
        showScores: true, // Puanları göster
        lastActivity: serverTimestamp(),
      })
    } catch (error) {
      toast.error("Puanlar gösterilirken bir hata oluştu")
    }
  }

  const restartGame = async () => {
    if (!room || !roomId || room.host !== currentUser?.uid) return

    try {
      // Generate new words
      let words = []
      if (room.settings.wordSource === "categories") {
        try {
          words = await fetchWordsFromCategories(room.settings.selectedCategories, room.settings.wordCount)
          if (!words || words.length === 0) {
            words = getFallbackWords(room.settings.wordCount)
          }
        } catch (error) {
          words = getFallbackWords(room.settings.wordCount)
        }
      } else {
        if (room.settings.customWords && room.settings.customWords.length > 0) {
          words = shuffleArray([...room.settings.customWords]).slice(0, room.settings.wordCount)
        } else {
          words = getFallbackWords(room.settings.wordCount)
        }
      }

      // Reset player scores
      const resetPlayers = room.players.map((player: any) => ({
        ...player,
        score: 0,
      }))

      await updateDoc(roomRef.current, {
        status: "playing",
        currentRound: 0,
        words,
        players: resetPlayers,
        gameStartTime: serverTimestamp(),
        lastActivity: serverTimestamp(),
        showScores: false, // Puanları gösterme durumunu sıfırla
      })

      // Clear answers in realtime database
      const answersRef = ref(rtdb, `rooms/${roomId}/answers`)
      await set(answersRef, null)

      // Reset local state
      setGameEnded(false)
      setShowScoreboard(false)
      setRoundResults(null)
      currentRoundRef.current = -1
      allPlayersAnsweredRef.current = false
      setAnsweredCount(0) // Cevaplayan sayısını sıfırla
    } catch (error) {
      toast.error("Oyun yeniden başlatılırken bir hata oluştu")
    }
  }

  const returnToRoom = async () => {
    if (!roomId) return

    try {
      await updateDoc(roomRef.current, {
        status: "waiting",
        lastActivity: serverTimestamp(),
      })

      navigate(`/room/${roomId}`)
    } catch (error) {
      toast.error("Odaya dönülürken bir hata oluştu")
    }
  }

  // Oyundan çıkma fonksiyonu
  const leaveGame = async () => {
    if (!roomId || !currentUser) return

    try {
      const roomSnap = await getDoc(roomRef.current)

      if (!roomSnap.exists()) {
        navigate("/")
        return
      }

      const roomData = roomSnap.data() as { host: string; players: { id: string }[]; status: string }
      const isHost = roomData.host === currentUser.uid

      if (isHost) {
        // Eğer ev sahibi çıkıyorsa, oyunu bitir ve odaya dön
        await updateDoc(roomRef.current, {
          status: "waiting",
          lastActivity: serverTimestamp(),
        })

        toast.success("Oyun sonlandırıldı ve odaya dönüldü")
      } else {
        // Eğer normal oyuncu çıkıyorsa, oyuncuyu listeden çıkar
        const updatedPlayers = roomData.players.filter((player: any) => player.id !== currentUser.uid)

        await updateDoc(roomRef.current, {
          players: updatedPlayers,
          lastActivity: serverTimestamp(),
        })

        toast.success("Oyundan çıkıldı")
      }

      navigate("/")
    } catch (error) {
      toast.error("Oyundan çıkılırken bir hata oluştu")
    }
  }

  // Manuel olarak sonraki tura geçme fonksiyonu (tüm oyuncular için)
  const forceNextRound = async () => {
    if (!room || !roomId || room.host !== currentUser?.uid) return

    try {
      // Tüm oyuncular için cevap oluştur
      const answersRef = ref(rtdb, `rooms/${roomId}/answers/${room.currentRound}`)
      const answersSnapshot = await get(answersRef)
      const answers = answersSnapshot.val() || {}

      // Cevap vermemiş oyuncular için boş cevap ekle
      for (const player of room.players) {
        if (!answers[player.id]) {
          await set(ref(rtdb, `rooms/${roomId}/answers/${room.currentRound}/${player.id}`), {
            answer: "",
            time: room.settings.timePerWord,
            correct: false,
          })
        }
      }

      // Sonraki tura geç
      advanceToNextRound()
    } catch (error) {
      toast.error("Tur geçilirken bir hata oluştu")
    }
  }

  // Yükleme ekranı
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
        <div className="animate-pulse flex flex-col items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-3xl shadow-lg">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
          <div className="text-2xl font-medium text-indigo-700 dark:text-indigo-300">Yükleniyor...</div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Oyun hazırlanıyor</p>
        </div>
      </div>
    )
  }

  // Oyun bitti ve puanlar gösterilecek
  if (gameEnded) {
    if (room?.showScores) {
      return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 flex items-center justify-center">
          <div className="w-full max-w-5xl animate-fade-in">
            <div className="glass-card shadow-xl p-6 md:p-8 backdrop-blur-lg border border-white/20 dark:border-gray-700/30">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center gap-3">
                    <Award className="w-8 h-8 text-amber-500" />
                    Oyun Bitti!
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Oda Kodu: <span className="font-medium">{roomId}</span>
                  </p>
                </div>
                <button
                  onClick={leaveGame}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Oyundan Çık</span>
                </button>
              </div>

              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-6 rounded-3xl shadow-lg mb-8 border border-gray-100 dark:border-gray-700">
                <ScoreBoard players={room.players} />
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-6">
                {room.host === currentUser?.uid && (
                  <button
                    onClick={restartGame}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
                  >
                    <Play className="w-6 h-6" />
                    <span className="text-lg">Yeniden Başlat</span>
                  </button>
                )}
                <button
                  onClick={returnToRoom}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0"
                >
                  <Home className="w-6 h-6" />
                  <span className="text-lg">Odaya Dön</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    } else {
      // Oyun bitti ama puanlar henüz gösterilmedi
      return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 flex items-center justify-center">
          <div className="w-full max-w-5xl animate-fade-in">
            <div className="glass-card shadow-xl p-6 md:p-8 backdrop-blur-lg border border-white/20 dark:border-gray-700/30">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center gap-3">
                    <Award className="w-8 h-8 text-amber-500" />
                    Oyun Bitti!
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Oda Kodu: <span className="font-medium">{roomId}</span>
                  </p>
                </div>
                <button
                  onClick={leaveGame}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Oyundan Çık</span>
                </button>
              </div>

              <div className="text-center p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-lg animate-pulse-slow border border-gray-100 dark:border-gray-700">
                <Award className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                <p className="text-2xl mb-6 text-gray-800 dark:text-gray-200 font-bold">Tüm kelimeler tamamlandı!</p>
                <p className="text-lg mb-6 text-gray-600 dark:text-gray-300">Oda sahibi puanları gösterecek...</p>
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mt-8"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  // Tur sonuçları ekranı
  if (showScoreboard && roundResults) {
    const correctWord = currentWord ? (currentWord.isEnglish ? currentWord.turkish : currentWord.english) : ""

    // Oyuncuları puana göre sırala
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score)

    // Mevcut kullanıcının sonuçlarını bul
    const currentPlayerResult = roundResults.find((player: any) => player.id === currentUser?.uid)

    // Mevcut kullanıcının sıralamasını bul
    const currentPlayerRank = sortedPlayers.findIndex((player: any) => player.id === currentUser?.uid) + 1

    return (
      <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 flex items-center justify-center">
        <div className="w-full max-w-5xl animate-fade-in">
          <div className="glass-card shadow-xl p-6 md:p-8 backdrop-blur-lg border border-white/20 dark:border-gray-700/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                  Tur Sonuçları
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Oda Kodu: <span className="font-medium">{roomId}</span>
                </p>
              </div>
              <button
                onClick={leaveGame}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Oyundan Çık</span>
              </button>
            </div>

            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-5 rounded-3xl mb-8 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                  <p className="text-lg mb-2 text-gray-800 dark:text-gray-200">
                    Doğru Cevap: <span className="font-bold text-emerald-600 dark:text-emerald-400">{correctWord}</span>
                  </p>
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    Kelime:{" "}
                    <span className="font-bold">
                      {currentWord.isEnglish ? currentWord.english : currentWord.turkish}
                    </span>
                  </p>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    Tur:{" "}
                    <span className="font-bold">
                      {room.currentRound + 1}/{room.words.length}
                    </span>
                  </p>
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    Cevaplayan:{" "}
                    <span className="font-bold">
                      {answeredCount}/{room.players.length}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Kullanıcının kendi sonucu */}
            {currentPlayerResult && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-6 rounded-3xl mb-8 border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" />
                  Senin Sonucun
                </h3>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Cevabın:{" "}
                      {currentPlayerResult.answer ? (
                        <span className="font-bold text-indigo-600 dark:text-indigo-300">{`"${currentPlayerResult.answer}"`}</span>
                      ) : (
                        <span className="italic text-gray-500 dark:text-gray-400">Cevap vermedin</span>
                      )}
                    </p>
                    <p className="font-medium mt-3 text-gray-800 dark:text-gray-200">
                      Durum:{" "}
                      <span
                        className={
                          currentPlayerResult.isCorrect
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-red-600 dark:text-red-400 font-bold"
                        }
                      >
                        {currentPlayerResult.isCorrect ? "✓ Doğru" : "✗ Yanlış"}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Süre: <span className="font-bold">{currentPlayerResult.time}s</span>
                    </p>
                    <p className="font-bold text-xl mt-2">
                      {currentPlayerResult.isCorrect ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{currentPlayerResult.roundScore} puan
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">0 puan</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-800">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Güncel Sıralaman:{" "}
                      <span className="font-bold text-indigo-600 dark:text-indigo-300">{currentPlayerRank}. sıra</span>
                    </p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Toplam Puanın:{" "}
                      <span className="font-bold text-indigo-600 dark:text-indigo-300">
                        {currentPlayerResult.updatedTotalScore}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 text-center">
              {room.host === currentUser?.uid ? (
                <>
                  {room.currentRound + 1 >= room.words.length ? (
                    // Son kelime ise "Puanları göster" butonu
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={showFinalScores}
                        className="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-1 active:translate-y-0 text-lg"
                      >
                        <Award className="w-6 h-6" />
                        <span>Puanları Göster</span>
                      </button>
                    </div>
                  ) : (
                    // Son kelime değilse normal butonlar
                    <>
                      <p className="text-lg mb-6 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        {autoAdvanceTimer !== null
                          ? `Sonraki tura ${autoAdvanceTimer} saniye içinde geçilecek...`
                          : "Sonraki tura geçiliyor..."}
                      </p>
                      <div className="flex flex-wrap justify-center gap-4 mt-2">
                        <button
                          onClick={advanceToNextRound}
                          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
                        >
                          <SkipForward className="w-5 h-5" />
                          <span>Sonraki Tura Geç</span>
                        </button>
                        <button
                          onClick={forceNextRound}
                          className="px-6 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
                        >
                          <SkipForward className="w-5 h-5" />
                          <span>Zorla Geçiş (Tüm Oyuncular)</span>
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-lg animate-pulse-slow text-gray-800 dark:text-gray-200 mb-4">
                    {room.currentRound + 1 >= room.words.length
                      ? "Oda sahibi puanları gösterecek..."
                      : "Oda sahibi sonraki tura geçecek..."}
                  </p>
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ana oyun ekranı
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 flex items-center justify-center">
      <div className="w-full max-w-5xl animate-fade-in">
        <div className="glass-card shadow-xl p-6 md:p-8 backdrop-blur-lg border border-white/20 dark:border-gray-700/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              {/* Başlık kısmını güncelleyelim */}
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/owly-logo.svg"
                  alt="Owly Logo"
                  className="w-10 h-10 drop-shadow-lg"
                  style={{ animation: "float 3s ease-in-out infinite" }}
                />
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 tracking-wide flex items-center gap-2">
                  <span>Tur: </span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {room.currentRound + 1}/{room.words.length}
                  </span>
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    Oda: <span className="font-medium">{roomId}</span>
                  </span>
                </p>
                {/* Cevaplayan oyuncu sayısı */}
                <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-sm font-medium rounded-full flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>
                    Cevaplayan: {answeredCount}/{room.players.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
                <Clock className="w-5 h-5 text-indigo-500" />
                <span className={timeLeft < 5 ? "text-red-500 animate-pulse" : ""}>{timeLeft}</span>
              </div>
              <button
                onClick={leaveGame}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Çık</span>
              </button>
            </div>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-3xl mb-8 shadow-lg border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl mb-6 text-center text-gray-800 dark:text-gray-200 font-medium">
              {currentWord.isEnglish ? "İngilizce kelimeyi Türkçeye çevirin:" : "Türkçe kelimeyi İngilizceye çevirin:"}
            </h2>
            <div className="text-4xl md:text-5xl font-bold text-center p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-3xl shadow-inner text-gray-900 dark:text-white border border-indigo-100 dark:border-indigo-800/50">
              {currentWord.isEnglish ? currentWord.english : currentWord.turkish}
            </div>
          </div>

          <AnswerInput value={answer} onChange={setAnswer} onSubmit={submitAnswer} disabled={!!answeredTime} />

          {room.host === currentUser?.uid && answeredTime !== null && (
            <div className="mt-8">
              <button
                onClick={forceNextRound}
                className="w-full px-5 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0"
              >
                <SkipForward className="w-5 h-5" />
                <span>Tüm Oyuncular İçin Zorla Geçiş</span>
              </button>
              <p className="text-xs text-center mt-3 text-gray-500 dark:text-gray-400">
                (Bu buton tüm oyuncular için otomatik cevap oluşturur ve sonraki tura geçer)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Game

