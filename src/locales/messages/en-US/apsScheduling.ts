export const apsScheduling = {
  layout: {
    title: 'APS Scheduling',
    tabs: {
      board: 'APS Board',
      engineConfig: 'Greedy Engine Config',
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
  engineConfig: {
    title: 'Greedy Engine Config',
    subtitle: 'Start with a visible shell for rule structure and factor cards, then connect it to live scheduling later.',
    sections: {
      factorDeckTitle: 'Factor Card Deck',
    },
    dateCard: {
      title: 'Date / Rest Days / Holidays',
      description: 'Start by extracting workdays, weekend rest days, and statutory holidays into one independent factor card before wiring them into live scheduling.',
      summary: {
        defaultWorkdayLabel: 'Default Workdays',
        defaultWorkdayValue: 'Weekdays are currently shown as schedulable by default.',
        weekendRestLabel: 'Weekend Handling',
        weekendRestValue: 'Weekends are shown as rest days in preview only and are not yet wired to live blocking logic.',
        holidayStopLabel: 'Holiday Handling',
        holidayStopValue: 'Holidays are currently shown as stop-day placeholders until real rules are connected.',
      },
    },
  },
  process: {
    title: 'Process Overview',
    subtitle: 'This view is now bound to the live line-management process mapping.',
  },
}
