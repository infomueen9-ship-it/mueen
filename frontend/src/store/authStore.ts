import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  name: string | null
  role: string | null
  type: string | null
  teacherId: number | null
  isAuthenticated: boolean
  setAuth: (token: string, name: string, role: string, type?: string, teacherId?: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      name: null,
      role: null,
      type: null,
      teacherId: null,
      isAuthenticated: false,

      setAuth: (token, name, role, type, teacherId) =>
        set({
          token,
          name,
          role,
          type: type ?? null,
          teacherId: teacherId ?? null,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          name: null,
          role: null,
          type: null,
          teacherId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'mueen-auth',

      onRehydrateStorage: () => (state) => {
        if (!state) return

        // فقط قراءة، بدون تعديل مباشر
        const hasToken = !!state.token

        // استخدام set عبر الرجوع للـ store لاحقاً (حل آمن)
        state.isAuthenticated = hasToken
      },
    }
  )
)
