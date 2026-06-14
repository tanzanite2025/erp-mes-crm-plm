export const messageCenter = {
  title: '消息中心',
  subtitle:
    '在这里统一配置业务状态触发的通知与审批，维护可监听的业务事件源、通知内容模板，并在需要时查看执行日志。',
  tabs: {
    rules: '通知监听规则',
    sources: '业务事件源',
    templates: '通知内容模板',
    executions: '执行日志',
  },
  pages: {
    rules: {
      title: '通知监听规则',
      description:
        '统一管理业务状态触发的通知与审批规则，按业务源筛选并快速建立新的监听规则。',
    },
    sources: {
      title: '业务事件源',
      description:
        '维护进入消息执行链的业务事件源，支持模板导入、展开核查与状态驱动配置。',
    },
    templates: {
      title: '通知内容模板',
      description:
        '集中维护可复用的通知标题、正文与跳转链接，供消息规则统一引用。',
    },
    executions: {
      title: '执行日志',
      description:
        '查看规则命中、通知动作与审批动作的执行记录，支持按业务源与结果回溯筛选。',
    },
  },
} as const
