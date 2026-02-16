import { createRootRoute } from '@tanstack/react-router'
import { AppShell } from '../App'
import { NotFoundPage } from '../pages/not-found'
import { RouteErrorPage } from '../pages/route-error'

export const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage
})
