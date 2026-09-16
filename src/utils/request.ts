import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { message } from 'antd'
import { useUserStore } from '@/store/modules/user'
import type { Result } from '@/types/api'

/**
 * axios 实例封装
 * - 请求拦截：自动携带 token
 * - 响应拦截：统一处理业务码、错误提示、401 登出
 */
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

/** 401 兜底提示文案（后端未返回 message 时使用） */
const UNAUTHORIZED_MESSAGE = '登录已失效，即将跳转到登录页'

/** 401 提示后延迟跳转登录页的时长（毫秒），留出时间让用户看清提示 */
const LOGIN_REDIRECT_DELAY = 2000

/** 跳转登录页的定时器句柄：非空表示已进入 401 跳转流程 */
let redirectTimer: number | null = null

/**
 * 统一处理 401（未登录 / token 失效）
 * 先弹出错误提示，延迟数秒后再清除登录态并跳转登录页，避免页面无提示直接刷新
 * @param msg 提示文案，缺省使用统一兜底文案
 */
function handleUnauthorized(msg?: string) {
  // 已在跳转流程中：并发请求同时 401 时只提示、只跳转一次
  if (redirectTimer !== null) return
  message.error({
    content: msg || UNAUTHORIZED_MESSAGE,
    // 提示常驻到跳转时刻，避免延迟期间自动关闭导致用户没看到原因
    duration: LOGIN_REDIRECT_DELAY / 1000,
  })
  redirectTimer = window.setTimeout(() => {
    redirectTimer = null
    // 先取路径再清 token：清空后 AuthGuard 会立刻重定向，届时拿不到原页面路径
    const onLoginPage = window.location.pathname.includes('/login')
    // 延迟结束后才登出，否则 AuthGuard 会在提示展示期间就把页面跳走
    useUserStore.getState().logout()
    // 已在登录页（如登录接口自身返回 401）无需整页刷新，保留错误提示即可
    if (onLoginPage) return
    window.location.href = '/login'
  }, LOGIN_REDIRECT_DELAY)
}

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const { token } = useUserStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 客户端类型标识（共通 §3.1）
    config.headers['X-Client-Type'] = 'web-admin'
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<Result>) => {
    // 二进制流直接返回原始响应
    const { responseType } = response.config
    if (responseType === 'blob' || responseType === 'arraybuffer') {
      return response
    }
    const res = response.data
    // 业务成功，直接返回 data
    if (res.code === 0) {
      return res.data as never
    }
    // 401 未登录 / token 失效
    if (res.code === 401) {
      handleUnauthorized(res.message)
      return Promise.reject(new Error(res.message || UNAUTHORIZED_MESSAGE))
    }
    message.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  async (error: AxiosError<Result>) => {
    const status = error.response?.status
    // 二进制流请求（如导出）失败时，后端返回的仍是 JSON，只是被 axios 当成了 Blob：先读出来才能取到 message
    const raw = error.response?.data
    let backendMessage: string | undefined
    if (raw instanceof Blob) {
      try {
        backendMessage = (JSON.parse(await raw.text()) as Result).message
      } catch {
        /* 不是 JSON（例如纯文本错误页）时忽略，走兜底文案 */
      }
    } else {
      backendMessage = raw?.message
    }
    const msg = backendMessage || error.message || '网络异常，请稍后重试'
    if (status === 401) {
      // 401 优先展示后端文案，取不到时由 handleUnauthorized 使用兜底文案
      handleUnauthorized(backendMessage)
    } else {
      message.error(msg)
    }
    return Promise.reject(error)
  },
)

/** 泛型请求方法（响应已解包为 data） */
function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return service.request(config) as unknown as Promise<T>
}

/** 统一导出的 http 方法 */
export const http = {
  get<T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'GET', params, ...config })
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'POST', data, ...config })
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'PUT', data, ...config })
  },
  delete<T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'DELETE', params, ...config })
  },
}

/** 原始 axios 实例（特殊场景可绕过统一解包） */
export default service
