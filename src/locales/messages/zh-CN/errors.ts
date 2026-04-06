export const errors = {
  forbidden: {
    title: '403',
    subtitle: '禁止访问',
    description: '您没有权限查看此资源。',
    cachedSessionHint: '如果此错误源于缓存的会话，请尝试注销并重新登录。',
    goBack: '返回上一页',
    relogin: '重新登录',
    backHome: '返回首页',
  },
  notFound: {
    title: '404',
    subtitle: '页面未找到',
    description: '您访问的页面不存在或已被移除。',
    goBack: '返回上一页',
    backHome: '返回首页',
  },
  general: {
    title: '500',
    subtitle: '发生错误',
    description: '系统检测到未知异常，请稍后再试或联系管理员。',
    goBack: '返回上一页',
    backHome: '返回首页',
  },
  unauthorized: {
    title: '401',
    subtitle: '未经授权',
    description: '请登录后继续访问。',
    backLogin: '前往登录',
  },
  maintenance: {
    title: '维护中',
    subtitle: '系统维护',
    description: '我们正在进行系统优化，请稍候再来。',
  },
} as const
