import { create } from 'zustand'

export type ModuleKey = 
  | 'dashboard'
  | 'members'
  | 'savings'
  | 'loans'
  | 'accounting'
  | 'hr'
  | 'inventory'
  | 'assets'
  | 'shares'
  | 'meetings'
  | 'reports'
  | 'settings'

interface NavigationState {
  activeModule: ModuleKey
  setActiveModule: (module: ModuleKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
