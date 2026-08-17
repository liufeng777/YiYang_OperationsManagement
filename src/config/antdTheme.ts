import type { ThemeConfig } from 'antd'

/**
 * antd v5 主题配置
 * 与 src/styles/variables.less 中的设计变量保持一致
 * 修改设计规范时，此处与 variables.less 需同步更新
 */
const brandPrimary = '#27866B'
const brandPrimaryDark = '#185D4C'

const antdTheme: ThemeConfig = {
  token: {
    // 品牌色
    colorPrimary: brandPrimary,
    colorPrimaryHover: brandPrimaryDark,
    colorPrimaryActive: brandPrimaryDark,
    colorLink: '#3478F6',
    colorInfo: '#3478F6',
    colorSuccess: brandPrimary,
    colorWarning: '#F3B56A',
    colorError: '#F45B4F',
    // 表面与背景
    colorBgLayout: '#FAF9F6',
    colorBgContainer: '#FFFFFF',
    colorBorderSecondary: '#EBEDEA',
    // 文字
    colorText: '#1F2D2A',
    colorTextSecondary: '#66736F',
    colorTextTertiary: '#66736F',
    // 字体
    fontFamily:
      "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    // 圆角
    borderRadius: 6,
    // 组件尺寸
    controlHeight: 34,
    // 页面主标题
    fontSizeHeading1: 28,
    // 模块标题
    fontSizeHeading2: 20,
    // 卡片标题
    fontSizeHeading3: 16,
    // 正文
    fontSize: 14,
    // 标签与字段名
    fontSizeSM: 13,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#FAF9F6',
      headerHeight: 56,
    },
    Menu: {
      // 浅色侧边栏激活样式（对齐设计稿）：
      // - 一级项 / 父级标题选中：浅灰底 #F3F5F4 + 品牌色文字
      // - 二级子项选中：品牌浅底色 #E8F4F0（见 layout.less 中的覆盖）
      itemSelectedBg: '#F3F5F4',
      itemSelectedColor: brandPrimary,
      itemHoverBg: 'rgba(39, 134, 107, 0.08)',
      itemHoverColor: brandPrimary,
      subMenuItemSelectedColor: brandPrimary,
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemHeight: 42,
    },
    Button: {
      // 文字/链接按钮使用品牌主色（悬停为品牌深色）
      colorLink: brandPrimary,
      colorLinkHover: brandPrimaryDark,
      colorLinkActive: brandPrimaryDark,
    },
    Card: {
      headerBg: '#FFFFFF',
    },
    Table: {
      headerBg: '#F7F8F6',
      headerColor: '#66736F',
      headerSplitColor: 'transparent',
    },
  },
}

export default antdTheme
