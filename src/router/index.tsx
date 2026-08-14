/**
 * 路由渲染入口
 * 根据 routes 配置递归生成 Route 树
 */
import { Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { routes, type RouteConfig } from './routes'
import { AuthGuard } from './guard'
import BasicLayout from '@/layouts/BasicLayout'
import PageLoading from '@/components/PageLoading'
import Login from '@/pages/login'
import NotFound from '@/pages/error/404'
import Forbidden from '@/pages/error/403'

/** 懒加载组件包装（Suspense + 加载态） */
function renderElement(route: RouteConfig) {
  const Component = route.component
  if (!Component) return null
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  )
}

/** 递归渲染路由 */
function renderRoutes(list: RouteConfig[]) {
  return list.map((route) => {
    const children = route.children ?? []

    // 仅含默认页的一级导航：渲染为单页
    if (children.length === 1 && children[0].path === '' && children[0].component) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={renderElement(children[0])}
        />
      )
    }

    // 含多个二级导航：父级作为路径分组，子级相对路径渲染
    if (children.length > 0) {
      return (
        <Route key={route.path} path={route.path}>
          {children.map((child) =>
            child.path === '' ? (
              <Route key={route.path} index element={renderElement(child)} />
            ) : (
              <Route key={child.path} path={child.path} element={renderElement(child)} />
            ),
          )}
        </Route>
      )
    }

    return <Route key={route.path} path={route.path} element={renderElement(route)} />
  })
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <AuthGuard>
            <BasicLayout />
          </AuthGuard>
        }
      >
        {renderRoutes(routes)}
        <Route path="403" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
