import { Outlet } from '@tanstack/react-router'

import { Sidebar } from './components/sidebar'
import { TopBar } from './components/topbar'

export function AppShell() {
  return (
    <div className='flex min-h-screen'>
      <Sidebar />
      <div className='flex min-h-screen flex-1 flex-col'>
        <TopBar />
        <main className='flex-1 space-y-6 p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
