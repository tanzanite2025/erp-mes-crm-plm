export const users = {
  layout: {
    title: 'Account Management Center',
    subtitle:
      'ACCOUNT MANAGEMENT / Global profile, explicit permissions, and security auditing',
    listTitle: 'User List',
    listSubtitle: 'Manage user information and explicit permissions here.',
    errorLoad: 'Failed to load user information, please try again.',
  },
  table: {
    searchPlaceholder: 'Filter users...',
    syncing: 'Loading sync data from backend cluster... SYNCING',
    noResults: 'No matching account records found NO_RESULTS',
    filters: {
      status: 'Status',
    },
    protectedTooltip:
      'System core account is protected and cannot be changed here',
  },
  columns: {
    username: 'Username',
    name: 'Name',
    role: 'Role',
    phone: 'Phone Number',
    status: 'Status',
    actions: 'Actions',
  },
  actions: {
    addUser: 'Add User NEW_USER',
    addProtectedAccount: 'Create Protected Account ADD_SECURE',
    managePermissions: 'Manage Permissions',
    invite: 'Invite Selected Users',
    activate: 'Activate Selected Users',
    deactivate: 'Deactivate Selected Users',
  },
  permissionAssignments: {
    title: 'Explicit Permission Management',
    subtitle: 'Manage explicit permission assignments for {{username}}',
    loading: 'Loading explicit permission assignments...',
    accessLoading: 'Loading access snapshot...',
    empty: 'No explicit permission assignments found',
    summary: {
      title: 'Permission Overview',
      explicitPermissionCount: 'Current Explicit Permission Count',
      status: 'Status',
      diagnostics: 'Diagnostics',
      unsavedChanges: 'Unsaved Changes',
      changed: 'Yes',
      unchanged: 'No',
      none: 'None',
    },
    tree: {
      title: 'Explicit Permission Tree',
      empty: 'No matching permissions found',
      page: 'Page',
      tab: 'Tab',
      action: 'Action',
    },
    selected: {
      title: 'Selected Permissions',
      empty: 'No explicit permissions assigned yet',
    },
    actions: {
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      filterSelected: 'Selected Only',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      expand: 'Expand',
      collapse: 'Collapse',
      clear: 'Clear',
      reset: 'Reset Unsaved Changes',
      save: 'Save Explicit Permissions',
    },
    placeholders: {
      search: 'Search permission ID, label, description, or path',
    },
  },
  permissionPage: {
    title: 'User Permission Assignment Center',
    subtitle:
      'USER PERMISSIONS / Account-level explicit permission assignment and access profile review',
    stats: {
      total: 'Total Accounts',
      activeInView: 'Active Accounts In View',
      protectedInView: 'Protected Accounts In View',
    },
    guideTitle: 'Assignment Guide',
    guideDescription:
      'Filter the target account first, then open the explicit permission assignment panel and save.',
    steps: {
      filter: 'Filter target accounts by username or status.',
      open: 'Click "Manage Permissions" on the target account row to open explicit permission assignment.',
      save: 'Review the access profile and selected permissions, then save.',
    },
    listTitle: 'Accounts Pending Assignment',
    listSubtitle:
      'This page only handles account-level explicit permission assignment, not account creation, deletion, or bulk maintenance.',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
  },
  dialogs: {
    editTitle: 'Account Profile Maintenance',
    createTitle: 'New Account Provisioning',
    editSubtitle:
      'Updating security parameters and explicit permission configuration.',
    createSubtitle:
      'Assigning managed access credentials and system privileges. Syncing to the audit cluster.',
    accessVerifyTitle: 'Identity Verification IDENTITY_VERIFY',
    protectedAccountCreateTitle:
      'Protected Account Provisioning SECURE_PROVISIONING',
    accessVerifySubtitle:
      'Complete highest-level verification before management changes to ensure system integrity.',
    protectedAccountCreateSubtitle:
      'Verification passed. You can now create a protected account with full-system management permissions.',
    accessVerifyHint: 'Requires developer-level access code to unlock',
    accessVerifyPlaceholder: 'ENTER 8-BIT ACCESS CODE',
    accessVerifyButton: 'Verify Access VERIFY_ACCESS',
    accessProvisionExecuteButton: 'EXECUTE_PROVISIONING',
    protectedAccountCreateButton: 'Complete Provisioning EXECUTE_PROVISIONING',
    labels: {
      sync: 'System Sync',
      firstName: 'First Name',
      lastName: 'Last Name',
      username: 'Identifier',
      role: 'Role Binding',
      phone: 'Phone',
      password: 'Security',
      confirm: 'Confirm',
    },
    placeholders: {
      sync: 'Sync from existing profile...',
      syncSearch: 'Search name or department...',
      syncEmpty: 'No matching employee records found',
      firstName: 'e.g. John',
      lastName: 'e.g. Doe',
      username: 'e.g. john_doe',
      role: 'Select a single role template',
      roleEmpty: 'No role binding, explicit permissions only',
      phone: '+86 13800138000',
      passwordEdit: 'Leave blank to keep current',
      passwordCreate: 'At least 8 chars, incl. letters/digits',
      confirmEdit: 'Confirm new password (leave blank to skip)',
      confirmCreate: 'Re-enter to confirm',
    },
    hints: {
      sync: 'HINT: Selected profile syncs name, phone, and metadata.',
    },
    buttons: {
      save: 'Commit Changes',
      close: 'Cancel',
      confirm: 'Confirm',
    },
    delete: {
      title: 'REVOKE_CONFIRM',
      description:
        'Are you sure you want to revoke the account **{{name}}**? This action will permanently wipe associated explicit permission assignments and system access records from the cluster.',
      confirmHint: 'Please enter "{{word}}" to authorize destruction',
      confirmPlaceholder: 'Type "{{word}}"',
      warningTitle: 'CRITICAL_WARNING',
      warningDesc:
        'This instruction is irreversible. Once issued, all associated node permissions will be immediately detached physically.',
      button: 'EXECUTE_TERMINATION',
    },
    multiDelete: {
      title: 'BULK_REVOKE',
      description:
        'Are you sure you want to bulk revoke the selected **{{count}}** accounts? This action will immediately execute global access restrictions, and associated production/management sessions will be forced to terminate.',
      confirmHint: 'Please enter "{{word}}" to confirm bulk revocation',
      confirmPlaceholder: 'Type "{{word}}"',
      warningTitle: 'CRITICAL_WARNING',
      warningDesc:
        'Bulk revocation will cause multiple node permissions to detach simultaneously. Please verify identities carefully.',
      button: 'EXECUTE_BULK_TERMINATION',
    },
  },
  validation: {
    firstNameRequired: 'First name is required.',
    lastNameRequired: 'Last name is required.',
    usernameRequired: 'Username is required.',
    passwordRequired: 'Password is required.',
    passwordMin: 'Password must be at least 8 characters.',
    passwordLower: 'Password must contain at least one lowercase letter.',
    passwordDigit: 'Password must contain at least one digit.',
    passwordMismatch: 'Passwords do not match.',
    accessCodeError: 'Access code incorrect. Please contact system developer.',
    permissionDenied:
      'Insufficient permissions. Only users with full-system management permissions can perform this.',
  },
  toast: {
    loadFailed: 'Failed to load user list',
    saveSuccessUpdated: 'User profile updated',
    saveSuccessCreated: 'Account created successfully',
    deleteSuccess: 'Account successfully revoked',
    multiDeleteSyncing: 'Synchronizing bulk revocation... ({{count}} accounts)',
    multiDeleteSuccess:
      'Successfully revoked {{count}} accounts, permissions detached',
    inviteSyncing: 'Sending invitations...',
    inviteSuccess: 'Invitations sent to {{count}} users',
    activateSyncing: 'Activating users...',
    activateSuccess: '{{count}} users activated successfully',
    deactivateSyncing: 'Deactivating users...',
    deactivateSuccess: '{{count}} users deactivated successfully',
    protectedAccountActionSuccess: 'Protected account operation completed',
    protectedAccountActionFailed: 'Protected account operation failed',
    permissionAssignmentsSaved: 'Explicit permissions updated',
    noActionableUsers: 'Selected users are system-protected, action aborted',
    skippedProtected:
      'Automatically skipped {{count}} system-protected core accounts',
  },
} as const
