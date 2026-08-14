/**
 * ============================================================
 * 路由 / 菜单 统一配置（单一数据源）
 * - 本文件同时驱动：一级导航（侧边栏菜单）+ 二级导航 + 路由表
 * - 约定：
 *   1. 一级导航 path 为绝对路径；二级导航 path 为相对路径（'' 表示该一级导航的默认页）
 *   2. component 使用 React.lazy 懒加载，页面文件放在 src/pages 对应目录
 *   3. meta.hideInMenu = true 表示不进菜单（如详情页）
 *   4. 新增一级导航：在下方数组追加；新增二级导航：在对应 children 中追加
 * ============================================================
 */
import { lazy } from 'react'
import type { ReactNode } from 'react'
import {
  DashboardOutlined,
  BankOutlined,
  AppstoreOutlined,
  FlagOutlined,
  ProfileOutlined,
  UndoOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { LazyExoticComponent, ComponentType } from 'react'

export type LazyComponent = LazyExoticComponent<ComponentType>

export interface RouteMeta {
  /** 菜单 / 面包屑显示名称 */
  title: string
  /** 一级导航图标 */
  icon?: ReactNode
  /** 是否在菜单中隐藏 */
  hideInMenu?: boolean
  /** 是否需要登录（默认 true） */
  public?: boolean
}

export interface RouteConfig {
  /** 一级导航为绝对路径；二级导航为相对路径 */
  path: string
  meta: RouteMeta
  /** 懒加载组件（含子路由时，子级配置 component） */
  component?: LazyComponent
  children?: RouteConfig[]
}

/** 业务路由表（登录后展示） */
export const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    meta: { title: '运营首页', icon: <DashboardOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '数据总览' },
        component: lazy(() => import('@/pages/dashboard/index')),
      },
    ],
  },
  {
    path: '/institution',
    meta: { title: '机构管理', icon: <BankOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '机构列表' },
        component: lazy(() => import('@/pages/institution/list')),
      },
      {
        path: 'audit',
        meta: { title: '机构审核' },
        component: lazy(() => import('@/pages/institution/audit')),
      },
      {
        path: 'detail/:id',
        meta: { title: '机构详情', hideInMenu: true },
        component: lazy(() => import('@/pages/institution/detail')),
      },
    ],
  },
  {
    path: '/service',
    meta: { title: '服务项目', icon: <AppstoreOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '项目列表' },
        component: lazy(() => import('@/pages/service/list')),
      },
      {
        path: 'category',
        meta: { title: '项目分类' },
        component: lazy(() => import('@/pages/service/category')),
      },
      {
        path: 'detail/:id',
        meta: { title: '项目详情', hideInMenu: true },
        component: lazy(() => import('@/pages/service/detail')),
      },
    ],
  },
  {
    path: '/activity',
    meta: { title: '活动管理', icon: <FlagOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '活动列表' },
        component: lazy(() => import('@/pages/activity/list')),
      },
      {
        path: 'create',
        meta: { title: '创建活动' },
        component: lazy(() => import('@/pages/activity/create')),
      },
      {
        path: 'detail/:id',
        meta: { title: '活动详情', hideInMenu: true },
        component: lazy(() => import('@/pages/activity/detail')),
      },
    ],
  },
  {
    path: '/order',
    meta: { title: '订单中心', icon: <ProfileOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '订单列表' },
        component: lazy(() => import('@/pages/order/list')),
      },
      {
        path: 'detail/:id',
        meta: { title: '订单详情', hideInMenu: true },
        component: lazy(() => import('@/pages/order/detail')),
      },
    ],
  },
  {
    path: '/refund',
    meta: { title: '退款详情', icon: <UndoOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '退款申请' },
        component: lazy(() => import('@/pages/refund/list')),
      },
      {
        path: 'detail/:id',
        meta: { title: '退款处理', hideInMenu: true },
        component: lazy(() => import('@/pages/refund/detail')),
      },
    ],
  },
  {
    path: '/content',
    meta: { title: '内容配置', icon: <FileTextOutlined /> },
    children: [
      {
        path: '',
        meta: { title: 'Banner 配置' },
        component: lazy(() => import('@/pages/content/banner')),
      },
      {
        path: 'copy',
        meta: { title: '文案配置' },
        component: lazy(() => import('@/pages/content/copy')),
      },
    ],
  },
  {
    path: '/system',
    meta: { title: '系统设置', icon: <SettingOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '账号管理' },
        component: lazy(() => import('@/pages/system/account')),
      },
      {
        path: 'role',
        meta: { title: '角色权限' },
        component: lazy(() => import('@/pages/system/role')),
      },
      {
        path: 'log',
        meta: { title: '操作日志' },
        component: lazy(() => import('@/pages/system/log')),
      },
    ],
  },
]
