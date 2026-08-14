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

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const { token } = useUserStore.getState()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
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
      useUserStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(new Error(res.message || '登录已失效'))
    }
    message.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error: AxiosError<Result>) => {
    const status = error.response?.status
    const msg =
      error.response?.data?.message ||
      error.message ||
      '网络异常，请稍后重试'
    if (status === 401) {
      useUserStore.getState().logout()
      window.location.href = '/login'
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
