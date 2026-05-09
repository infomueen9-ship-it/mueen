import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  name: string | null
  role: string | null
  type: string | null
  teacherId: number | null
  isAuthenticated: boolean | undefined
  setAuth: (token: string, name: string, role: string, type?: string, teacherId?: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      name: null,
      role: null,
      type: null,
      teacherId: null,
      isAuthenticated: undefined,
      setAuth: (token: string, name: string, role: string, type?: string, teacherId?: number | null) => 
        set({ token, name, role, type, teacherId, isAuthenticated: true }),
      logout: () => set({ token: null, name: null, role: null, type: null, teacherId: null, isAuthenticated: false }),
    }),
    {
      name: 'mueen-auth',
      onRehydrateStorage: () => (state) => {
        // After rehydration, set isAuthenticated based on whether token exists
        if (state && state.token) {
          state.isAuthenticated = true;
        } else {
          state.isAuthenticated = false;
        }
      }
    }
  )
)