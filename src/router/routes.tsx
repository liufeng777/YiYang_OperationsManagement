/**
 * ============================================================
 * 路由 / 菜单 统一配置（单一数据源）
 * - 本文件同时驱动：一级导航（侧边栏菜单）+ 二级导航 + 路由表
 * - 约定：
 *   1. 一级导航 path 为绝对路径；二级导航 path 为相对路径（'' 表示该一级导航的默认页）
 *   2. component 使用 lazyWithReload 懒加载，支持发布后的旧 chunk 404 自动恢复
 *   3. meta.hideInMenu = true 表示不进菜单（如详情页）
 *   4. 新增一级导航：在下方数组追加；新增二级导航：在对应 children 中追加
 * ============================================================
 */
import type { ReactNode } from 'react'
import lazyWithReload from '@/utils/lazyWithReload'
import {
  DashboardOutlined,
  BankOutlined,
  AppstoreOutlined,
  FlagOutlined,
  ProfileOutlined,
  UndoOutlined,
  AccountBookOutlined,
  FileTextOutlined,
  TeamOutlined,
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
        component: lazyWithReload(() => import('@/pages/dashboard/index')),
      },
    ],
  },
  {
    path: '/institution',
    meta: { title: '机构管理', icon: <BankOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '机构管理' },
        component: lazyWithReload(() => import('@/pages/institution/list')),
      },
      {
        path: 'audit',
        meta: { title: '机构审核', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/institution/audit')),
      },
      {
        path: 'create',
        meta: { title: '新增机构', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/institution/create/index')),
      },
      {
        path: 'detail/:id',
        meta: { title: '机构详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/institution/detail')),
      },
    ],
  },
  {
    path: '/service',
    meta: { title: '服务项目', icon: <AppstoreOutlined /> },
    children: [
      {
        path: 'list',
        meta: { title: '集团服务池' },
        component: lazyWithReload(() => import('@/pages/service/list')),
      },
      {
        path: 'institution',
        meta: { title: '机构服务上下架' },
        component: lazyWithReload(() => import('@/pages/service/institution')),
      },
      {
        path: 'category',
        meta: { title: '服务分类', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/service/category')),
      },
      {
        path: 'list/detail/new',
        meta: { title: '新建服务项目', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/service/detail')),
      },
      {
        path: 'list/detail/:id',
        meta: { title: '编辑服务项目', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/service/detail')),
      }
    ],
  },
  {
    path: '/activity',
    meta: { title: '活动管理', icon: <FlagOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '活动管理' },
        component: lazyWithReload(() => import('@/pages/activity/list')),
      },
      {
        path: 'create',
        meta: { title: '新建活动', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/activity/create')),
      },
      {
        // 活动详情（原报名查询页）：从活动列表「查看」进入，不在菜单展示
        path: 'signups/:id',
        meta: { title: '报名查询', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/activity/sigunps')),
      },
      {
        // 详情页根据时间状态自动切换只读 / 编辑布局
        path: 'detail/:id',
        meta: { title: '活动详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/activity/detail')),
      },
      {
        // 兼容已有编辑链接，统一进入可按权限切换的详情页
        path: 'edit/:id',
        meta: { title: '编辑活动', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/activity/detail')),
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
        component: lazyWithReload(() => import('@/pages/order/list')),
      },
      {
        path: 'detail/:id',
        meta: { title: '订单详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/order/detail')),
      },
    ],
  },
  {
    path: '/refund',
    meta: { title: '退款管理', icon: <UndoOutlined /> },
    children: [
      {
        path: '',
        meta: { title: '退款列表' },
        component: lazyWithReload(() => import('@/pages/refund/list')),
      },
      {
        path: 'detail/:id',
        meta: { title: '退款审核详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/refund/detail')),
      },
    ],
  },
  {
    path: '/finance',
    meta: { title: '财务对账', icon: <AccountBookOutlined /> },
    children: [
      {
        path: 'summary',
        meta: { title: '账单汇总' },
        component: lazyWithReload(() => import('@/pages/finance/reconcile')),
      },
      {
        path: 'channel-log',
        meta: { title: '渠道流水' },
        component: lazyWithReload(() => import('@/pages/finance/channel-log')),
      },
      {
        path: 'channel-log/:id',
        meta: { title: '渠道流水详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/finance/channel-log/detail')),
      },
      {
        path: 'summary/:id',
        meta: { title: '对账详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/finance/reconcile/detail')),
      },
    ],
  },
  {
    path: '/content',
    meta: { title: '内容配置', icon: <FileTextOutlined /> },
    children: [
      {
        path: 'patient-homepage',
        meta: { title: '患者端首页配置' },
        component: lazyWithReload(() => import('@/pages/content/home')),
      },
      {
        path: 'article',
        meta: { title: '科普内容' },
        component: lazyWithReload(() => import('@/pages/content/Article')),
      },
      // {
      //   path: 'staff',
      //   meta: { title: '专业人员' },
      //   component: lazyWithReload(() => import('@/pages/content/staff')),
      // },
      {
        path: 'article/edit/:id',
        meta: { title: '新建科普内容', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/content/Article/Edit')),
      },
    ],
  },
  {
    path: '/member',
    meta: { title: '会员管理', icon: <TeamOutlined /> },
    children: [
      {
        path: 'registered',
        meta: { title: '注册用户' },
        component: lazyWithReload(() => import('@/pages/member/list')),
      },
      {
        path: 'registered/detail/:id',
        meta: { title: '会员详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/member/detail/index')),
      },
      {
        path: 'leads',
        meta: { title: '线索管理' },
        component: lazyWithReload(() => import('@/pages/member/leads')),
      },
      {
        path: 'leads/detail/:id',
        meta: { title: '线索详情', hideInMenu: true },
        component: lazyWithReload(() => import('@/pages/member/leads/detail/index')),
      },
      {
        path: 'referral',
        meta: { title: '推荐与奖励' },
        component: lazyWithReload(() => import('@/pages/member/referral')),
      },
    ],
  },
  {
    path: '/system',
    meta: { title: '系统设置', icon: <SettingOutlined /> },
    children: [
      {
        path: 'account',
        meta: { title: '人员管理' },
        component: lazyWithReload(() => import('@/pages/system/Account/account')),
      },
      {
        path: 'role',
        meta: { title: '角色管理' },
        component: lazyWithReload(() => import('@/pages/system/Role/role')),
      },
      {
        path: 'agreement',
        meta: { title: '协议与授权' },
        component: lazyWithReload(() => import('@/pages/system/Agreement/agreement')),
      },
      {
        path: 'help',
        meta: { title: '帮助与电话' },
        component: lazyWithReload(() => import('@/pages/system/Help/help')),
      },
      {
        path: 'message',
        meta: { title: '消息通知管理' },
        component: lazyWithReload(() => import('@/pages/system/Message/MessageManage')),
      },
      {
        path: 'settings',
        meta: { title: '运营参数配置' },
        component: lazyWithReload(() => import('@/pages/system/Settings/settings')),
      },
      // {
      //   path: 'payment',
      //   meta: { title: '支付设置' },
      //   component: lazyWithReload(() => import('@/pages/system/Payment/payment')),
      // },
      {
        path: 'log',
        meta: { title: '操作日志' },
        component: lazyWithReload(() => import('@/pages/system/Log/log')),
      },
    ],
  },
]
