/**
 * 路由守卫：未登录跳转登录页
 */
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useUserStore } from '@/store/modules/user'

export function AuthGuard({ children }: { children: ReactNode }) {
  const token = useUserStore((state) => state.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
