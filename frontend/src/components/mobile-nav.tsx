import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LayoutDashboard, FileText, AlertTriangle, Settings, Info, Menu } from 'lucide-react'

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/logs', label: 'Logs', icon: FileText },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info }
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className='md:hidden'>
      <Button variant='outline' size='icon' onClick={() => setOpen(true)} className='bg-muted/40'>
        <Menu className='h-4 w-4' />
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className='max-w-sm'>
          <DrawerHeader>
            <DrawerTitle>LOGNEXA</DrawerTitle>
          </DrawerHeader>
          <nav className='space-y-2'>
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40')}
                >
                  <Icon className='h-4 w-4' />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
