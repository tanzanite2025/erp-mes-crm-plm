export const aiAssistant = {
  accessControl: {
    title: 'AI Assistant Governance Center',
    subtitle: 'System-wide AI capability allocation and access control',
    global: {
      title: 'Global Capability Switch',
      description: 'Enable or disable all AI entry points',
      enabledTitle: 'AI global capability is enabled',
      disabledTitle: 'AI is muted across the system',
      hint: 'Affects AI entry visibility across all pages',
      disable: 'Disable All',
      enable: 'Enable Now',
    },
    permissions: {
      title: 'AI Page Capability Access',
      description:
        'Control AI conversations by actual route page, with one permission per page',
      searchPlaceholder: 'Search business modules or route pages',
      clearSearch: 'Clear search',
      selectedSummary: '{{selected}} / {{total}} selected',
      groupSummary: '{{selected}} / {{total}} selected',
      selectGroup: 'Select Group',
      clearGroup: 'Clear Group',
      empty: 'No matching permissions',
    },
    api: {
      title: 'Engine Gateway Settings',
      description: 'Configure API providers, models, and credentials',
      save: 'Save and Apply',
      saveSuccess: 'Engine gateway updated successfully',
      saveSuccessDescription: 'Switched to provider: {{provider}}',
      policySuccess: 'Governance policy updated',
      policySuccessDescription:
        'The new configuration has been persisted and synced to all terminals.',
      policyError: 'Failed to save the AI policy. Please try again.',
      provider: 'Model Provider',
      providerPlaceholder: 'Select a provider',
      providerGemini: 'Google Gemini (Recommended)',
      providerOpenAI: 'OpenAI / Azure',
      providerCustom: 'Private Deployment / Proxy',
      model: 'Default Model Name',
      apiKey: 'API Key',
      baseUrl: 'API Base URL (Optional)',
      groupIdRequired: 'GROUP_ID (Required for MiniMax)',
      groupIdOptional: 'GROUP_ID (Optional for MiniMax)',
      groupIdAlert:
        'Missing GROUP_ID in MiniMax mode will cause authentication failures',
      minimaxNoteTitle: 'Subscription Tip',
      minimaxNoteBody:
        'If you are using a token subscription plan, use a token-plan key (sk-cp-...). A standard API key may fail authentication.',
    },
    governance: {
      title: 'Governance Note',
      body: 'AI conversations are enabled independently for each route page. Account permissions still determine whether a user can enter that page; this policy only controls whether AI is available there. Gateway credentials stay in backend configuration and are injected only by the server proxy.',
    },
  },
} as const
