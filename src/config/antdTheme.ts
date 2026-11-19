import type { ThemeConfig } from 'antd'

/**
 * antd v5 主题配置
 * 与 src/styles/variables.less 中的设计变量保持一致
 * 修改设计规范时，此处与 variables.less 需同步更新
 */
const brandPrimary = '#27866B'
const brandPrimaryDark = '#185D4C'
const siderBg = '#075544'
const siderSelected = '#097D63'
const siderText = '#C0DCD3'
const siderGroup = '#6BAB9B'

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
      siderBg: siderBg,
      bodyBg: '#FAF9F6',
      headerHeight: 56,
    },
    Menu: {
      // 深绿侧边栏：弹层使用较亮绿色，具体菜单项状态见 layout.less
      itemBg: siderBg,
      popupBg: siderSelected,
      itemColor: siderText,
      groupTitleColor: siderGroup,
      subMenuItemBg: siderBg,
      itemSelectedBg: siderSelected,
      itemSelectedColor: siderText,
      itemHoverBg: siderSelected,
      itemHoverColor: siderText,
      subMenuItemSelectedColor: siderText,
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemHeight: 42,
    },
    Button: {
      // 文字/链接按钮使用品牌主色（悬停为品牌深色）
      colorLink: brandPrimary,
      colorLinkHover: brandPrimaryDark,
      colorLinkActive: brandPrimaryDark,
      // 基础（默认）按钮 hover/focus：边框与文字使用品牌深色（@color-primary-dark）
      defaultHoverColor: brandPrimaryDark,
      defaultHoverBorderColor: brandPrimaryDark,
      defaultActiveColor: brandPrimaryDark,
      defaultActiveBorderColor: brandPrimaryDark,
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
