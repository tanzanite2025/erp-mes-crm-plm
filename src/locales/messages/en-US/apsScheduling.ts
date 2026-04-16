export const apsScheduling = {
  layout: {
    title: 'APS Scheduling',
    tabs: {
      board: 'APS Board',
      process: 'Process Overview',
    },
  },
  board: {
    title: 'APS Scheduling Workspace',
    subtitle: 'A unified scheduling workspace for capacity, priority, and due-date coordination.',
    statusSummary: 'Current schedule: {total} orders, {running} running, {draft} pending, {late} at risk.',
    searchPlaceholder: 'Search order no., product, or line...',
    rules: 'Rules',
    create: 'New Schedule',
    pending: 'Pending / Draft',
    capacity: 'Capacity / Load',
    risk: 'Delay Risk / Risk',
    boardTitle: 'Timeline Board',
    boardSubtitle: 'Scheduling window / line load / delivery risk',
    laneLabel: 'Line / Time',
    live: 'Live',
    noResultsTitle: 'No matching schedules found',
    noResultsSubtitle: 'Try different keywords or clear the filter to view the schedule board again.',
    loading: 'Loading APS scheduling data...',
    refreshing: 'Refreshing APS scheduling data...',
    fallbackNotice: 'If the backend is unavailable, the page will fall back to local sample data.',
  },
  process: {
    title: 'Process Overview',
    subtitle: 'This view is now bound to the live line-management process mapping.',
  },
}
