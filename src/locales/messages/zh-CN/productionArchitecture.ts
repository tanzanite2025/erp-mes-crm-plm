export const productionArchitecture = {
  layout: {
    title: '生产架构',
    tabs: {
      mindmap: '产线脑图',
      hierarchyConfig: '层级配置',
      topology: '拓扑模板',
    },
  },
  mindmap: {
    header: {
      title: '产线脑图',
      subtitle:
        '以 {{level1Name}} / {{level2Name}} / {{level3Name}} 为层级骨架，验证新的受限脑图编辑方式',
    },
    actions: {
      currentLine: '当前产线',
      linePlaceholder: '选择要查看的产线',
      addLine: '新增产线',
      lineActions: '当前产线操作',
      editLine: '编辑产线资料',
      enableLine: '启用当前产线',
      disableLine: '停用当前产线',
      deleteLine: '删除当前产线',
      editNode: '编辑当前节点',
      noManagePermission: '当前账号没有产线管理权限',
      noUpdatePermission: '当前账号没有修改产线结构权限',
      noStatusPermission: '当前账号没有修改产线状态权限',
    },
  },
}
