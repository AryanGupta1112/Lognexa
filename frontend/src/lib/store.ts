import { create } from 'zustand'

type ThemeMode = 'dark' | 'light'

type UiState = {
  sidebarOpen: boolean
  theme: ThemeMode
  search: string
  selectedService: string
  timeRange: string
  streaming: boolean
  setSidebarOpen: (value: boolean) => void
  setTheme: (value: ThemeMode) => void
  setSearch: (value: string) => void
  setSelectedService: (value: string) => void
  setTimeRange: (value: string) => void
  setStreaming: (value: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  theme: 'dark',
  search: '',
  selectedService: 'all',
  timeRange: '1h',
  streaming: true,
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
  setTheme: (value) => set({ theme: value }),
  setSearch: (value) => set({ search: value }),
  setSelectedService: (value) => set({ selectedService: value }),
  setTimeRange: (value) => set({ timeRange: value }),
  setStreaming: (value) => set({ streaming: value })
}))
