import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../firebase/config"

// Kullanıcı adının blacklist'te olup olmadığını kontrol eden fonksiyon
export const isNicknameBlacklisted = async (nickname: string): Promise<boolean> => {
  try {
    // Blacklist koleksiyonunu sorgula
    const blacklistRef = collection(db, "blacklist")
    const q = query(blacklistRef, where("nickname", "==", nickname.toLowerCase()))
    const querySnapshot = await getDocs(q)

    // Eğer sorgu sonucu boş değilse, kullanıcı adı blacklist'te demektir
    return !querySnapshot.empty
  } catch (error) {
    console.error("Blacklist kontrolü sırasında hata:", error)
    // Hata durumunda false döndür - kullanıcı deneyimini bozmamak için
    // Güvenlik açısından kritik bir durum değilse, hata durumunda işlemi engellememek daha iyi olabilir
    return false
  }
}

