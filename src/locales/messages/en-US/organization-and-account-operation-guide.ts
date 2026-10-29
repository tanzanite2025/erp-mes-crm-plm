export const organizationAndAccountOperationGuide = {
  title: 'Organization & Account Guide',
  domainLabel: 'Organization & Personnel · Operation Guide',
  introduction:
    'Understand organizational ownership, employee records, sign-in accounts and access rights, then follow the steps to set them up and verify access.',
  mobileIntroduction:
    'Understand the relationships, then set up organizations, employees, accounts and access.',
  shortcutDescription:
    'Learn how organizations, employees, accounts and permissions relate, then set up accounts and handle personnel changes.',
  contentsLabel: 'Organization and account guide chapters',
  readingAreaLabel: 'Organization and account guide content',
  stepsLabel: 'Steps and explanations',
  exampleLabel: 'Worked example: an account for warehouse clerk Zhang Min',
  completionLabel: 'Check before finishing',
  referenceTitle: 'Open related pages',
  referenceDescription:
    'Complete changes in the relevant business page. Only destinations available to your account appear here.',
  references: {
    organization: 'Manage organizational structure',
    employees: 'Manage employee records',
    accounts: 'Create and maintain accounts',
    permissions: 'Assign user permissions',
    productionArchitecture: 'View production architecture',
  },
  actions: {
    createOrganization: 'Create organizational unit',
    createEmployee: 'Create employee record',
    createAccount: 'Create sign-in account',
    successNavigationHint:
      'Open the creation form here. After saving successfully, the relevant management page opens automatically.',
    loadingForm: 'Opening creation form…',
    parentOrganization: 'Parent organization',
    noParentOrganization: 'No parent: create a level-1 organization',
    parentOrganizationsLoadFailed:
      'Parent organizations could not be loaded. Close and retry, or create a level-1 organization.',
    parentOrganizationUnavailable:
      'The selected parent organization is no longer available. Choose a parent again before saving.',
  },
  concepts: {
    caption: 'What each record is for',
    nameHeader: 'Record',
    purposeHeader: 'Purpose',
    exampleHeader: 'Example',
    organization: {
      name: 'Organization',
      purpose:
        'Record the company, department and production unit to which people belong.',
      example: 'Headquarters → Warehouse Department',
    },
    employee: {
      name: 'Employee record',
      purpose:
        'Record a real employee’s staff number, name, employment details and status.',
      example: 'CK001, Zhang Min, Warehouse Department',
    },
    account: {
      name: 'Sign-in account',
      purpose:
        'Provide a system sign-in identity, optionally bound to one employee.',
      example: 'Username zhangmin.ck',
    },
    permission: {
      name: 'Account permissions',
      purpose:
        'Determine which pages an account can access and which actions it can perform.',
      example: 'Inventory viewing, with issuance actions granted when needed',
    },
  },
  chapters: {
    relationships: {
      label: 'Understand the relationships',
      shortLabel: 'Relationships',
      title: 'Distinguish organizations, employees, accounts and permissions',
      description:
        'Organizations describe where people belong, employee records describe who they are, accounts provide a sign-in identity, and permissions determine what that identity can do.',
      noticeTitle:
        'Organizational membership and positions do not grant access',
      noticeDescription:
        'Assigning a department or position, or linking production architecture, does not automatically grant menus, scanning or business actions. Access follows the account’s effective permissions.',
      example:
        'Create the Warehouse Department and Zhang Min’s employee record. If she needs the system, create an account and grant access for her warehouse responsibilities.',
      completion:
        'Distinguish all four records and decide whether this employee needs to sign in.',
    },
    organization: {
      label: 'Create organizational structure',
      shortLabel: 'Organizations',
      title: 'Set up the hierarchy used for employee membership',
      description:
        'The organization tree has a level-1 organization, level-2 departments and level-3 production units for organizational records and employee membership.',
      noticeTitle:
        'Maintain organization and production architecture separately',
      noticeDescription:
        'Production lines, segments and operations are maintained in production architecture. Organizational links describe relationships; they do not create lines or turn membership into production authorization.',
      example:
        'Create Headquarters, select it and add the Warehouse Department. Zhang Min can belong directly to that department; a third level is not required just to create her account.',
      completion:
        'The hierarchy and names are correct, and employee records can select the intended organizational unit.',
    },
    employees: {
      label: 'Create employee records',
      shortLabel: 'Employees',
      title: 'Create a verifiable record for each real employee',
      description:
        'Employee records hold staff numbers, names, organizational membership, employment status and other details. A separate account is needed for sign-in.',
      noticeTitle: 'An employee record does not create an account',
      noticeDescription:
        'Not every employee needs system access. Maintain employee records for personnel administration, and create accounts for people who need to sign in, with employee binding when appropriate.',
      example:
        'Create CK001, Zhang Min, select the Warehouse Department and check employment status and contact details. Verify the saved record before opening Accounts.',
      completion:
        'Staff number, name, organization and status are correct; duplicate staff numbers and import preview issues are resolved.',
    },
    accounts: {
      label: 'Create a sign-in account',
      shortLabel: 'Accounts',
      title: 'Create an account in the Accounts page',
      description:
        'An authorized operator creates the account. Employee binding, permission preset selection and ordinary account maintenance each require the relevant permissions.',
      noticeTitle:
        'Employee binding is optional; one employee cannot be bound to multiple accounts',
      noticeDescription:
        'Accounts can be created without employee binding. Authorized operators can select an employee to synchronize identity details. Bound name fields come from the employee record; maintain that record when details need to change.',
      example:
        'Create zhangmin.ck. If authorized, bind CK001 Zhang Min and check the synchronized name. Set a valid initial password, then choose a suitable non-admin preset or assign permissions separately later.',
      completion:
        'The account appears in the list, username and binding are correct, account status allows use, and sign-in and access verification are arranged.',
    },
    permissions: {
      label: 'Assign permissions',
      shortLabel: 'Permissions',
      title: 'Configure and verify access for actual work',
      description:
        'Permissions belong to accounts. Confirm the target, review permission sources and work scope, then save and verify the resulting access.',
      noticeTitle: 'Change inherited permissions at their preset source',
      noticeDescription:
        'Effective access combines the permission preset and permissions granted directly to the account. Removing a direct grant does not cancel an inherited grant; change the account’s preset or the preset contents when necessary.',
      example:
        'Select zhangmin.ck and open Permission Management. Configure the pages and actions needed for inventory viewing and warehouse movements, then verify both required and restricted capabilities using that account.',
      completion:
        'The target is correct, both permission sources are checked, saved changes can be reloaded, and visible pages and permitted actions match the work scope.',
    },
    personnelChanges: {
      label: 'Transfers, resignation and suspension',
      shortLabel: 'Changes',
      title: 'Review account access whenever employment details change',
      description:
        'Department transfers, responsibility changes and resignation involve employee records and account access. Check both after processing the change.',
      noticeTitle: 'Changing departments does not change permissions',
      noticeDescription:
        'Review the account’s preset and direct grants separately after a transfer. When restoring employment status, review account status and permissions before deciding whether to restore access.',
      example:
        'When Zhang Min moves from Warehouse to Purchasing, update her employee membership, review her account preset and direct grants, remove warehouse access no longer needed, and assign the purchasing access required for her new work.',
      completion:
        'Organizational membership, employment status, account status and effective access agree, and changes can be checked through audit history.',
    },
    troubleshooting: {
      label: 'Troubleshoot common problems',
      shortLabel: 'Troubleshooting',
      title: 'Check sign-in, page visibility and actions separately',
      description:
        'Identify the failing step before checking the relevant records. Repeated record creation or broader authorization does not replace diagnosis.',
      noticeTitle: 'Server and page errors need their own diagnosis',
      noticeDescription:
        'Access denials and 500 errors require different handling. Record the full URL, time, preceding action and error information for maintenance staff when a 500 occurs.',
      example:
        'If Zhang Min can sign in but cannot see Inventory, check the account she is using and its effective permissions. If the page reports 500, record the failing operation and error instead of assigning administrator access.',
      completion:
        'Provide the account, page and triggering steps, and distinguish missing records, insufficient permissions and system failures.',
    },
  },
  topics: {
    recommendedSequence: {
      title: 'Recommended setup order',
      description:
        'Organization → employee record → account → permissions → sign-in verification. This order makes records easier to check; accounts without employee binding can also be created independently.',
    },
    optionalAccountBinding: {
      title: 'When to bind an employee',
      description:
        'Binding helps identify the employee behind a personal system account. Employee records and accounts are separate, and a staff number is not necessarily the sign-in username.',
    },
    productionBoundary: {
      title: 'Review production responsibilities and access separately',
      description:
        'Managers, departments, positions and production links describe organizational and employment details. Business page access, scanning and actions still require the relevant account permissions.',
    },
    createCompany: {
      title: 'Step 1: create a level-1 organization',
      description:
        'Choose Create organizational unit in this chapter, select No parent and enter a name, manager and description. You can also create it from Organization. After saving, Organization opens so you can check the result.',
    },
    createDepartment: {
      title: 'Step 2: create a department under the organization',
      description:
        'In this chapter’s creation form, choose an existing level-1 organization as the parent to create a level-2 department. You can also select it in Organization and use Add Child. Check the parent and name before saving.',
    },
    createProductionUnit: {
      title: 'Step 3: add a third level when needed',
      description:
        'Select a level-2 department to add a level-3 production unit. This is the last level and cannot have children. Add it only when the personnel membership structure needs it.',
    },
    verifyOrganization: {
      title: 'Step 4: check the hierarchy and links',
      description:
        'Expand the saved tree and verify parents, managers and descriptions. Existing node levels cannot be changed directly in the edit form. Confirm production architecture exists before linking a line or segment.',
    },
    checkExistingEmployee: {
      title: 'Step 1: check staff number and name',
      description:
        'Search Employees for the staff number and name before creating a record. Edit the existing record for transfers or additional details instead of creating duplicates for the same person.',
    },
    createEmployeeRecord: {
      title: 'Step 2: enter the required details',
      description:
        'After checking for duplicates, choose Create employee record in this chapter. Enter the required staff number, name, organizational unit and employment status, then any other available details. Employees opens after a successful save.',
    },
    maintainEmployeeDetails: {
      title: 'Step 3: verify employment details',
      description:
        'Check organization, position, joining date and contact details. A position records employment information; it neither creates an account nor grants access. Recheck the saved list entry.',
    },
    importEmployees: {
      title: 'For batches: preview before importing',
      description:
        'Use the system’s employee template and prepare organizational units first. Upload and review new records, existing matches and errors. Add-only skips existing matches; synchronization updates them. Confirm the mode and impact before committing.',
    },
    prepareAccount: {
      title: 'Step 1: check the username and create an account',
      description:
        'Check Accounts to confirm the username is unused, then choose Create sign-in account in this chapter or Add Account in the list. Enter the name, username, password and confirmation. After saving, Accounts opens filtered by the new username.',
    },
    bindEmployee: {
      title: 'Step 2: optionally bind an employee and check the name',
      description:
        'If authorized, select an existing employee to synchronize identity details. If that employee is already bound, check the original account first. Without binding permission, or when not binding yet, enter the required identity details independently.',
    },
    setCredentials: {
      title: 'Step 3: set a valid password',
      description:
        'The account form requires at least 8 characters, including a lowercase letter and a digit, with matching confirmation. When editing, leaving the password blank keeps the existing password; a new password must still satisfy the rules and confirmation.',
    },
    choosePermissionPreset: {
      title: 'Step 4: choose a permission preset and save',
      description:
        'If authorized, choose a suitable preset or leave it unassigned and grant permissions separately later. Selecting the administrator preset requires administrator verification. After saving, check account status and actual access.',
    },
    selectTargetAccount: {
      title: 'Step 1: select the target account',
      description:
        'In User Permissions, search by username or status, select one manageable account and open Permission Management. Permission management access is required. Protected system accounts cannot be edited through ordinary account controls.',
    },
    understandPermissionSources: {
      title: 'Step 2: distinguish inherited and direct grants',
      description:
        'Review the preset, preset permission count and effective access before changing direct grants. Inherited items cannot be removed as direct grants. Change the assigned preset or its contents when needed, considering other accounts using a shared preset.',
    },
    grantRequiredActions: {
      title: 'Step 3: check page and action permissions',
      description:
        'Review menus, pages and actions for the actual tasks. Viewing a list does not by itself authorize creation, editing, deletion or approval. Broad menu or page grants can cover child pages, so check that scope too. Organization and position do not replace authorization.',
    },
    verifyEffectiveAccess: {
      title: 'Step 4: verify after saving',
      description:
        'Reopen the same account’s permission panel to verify the saved state. Refresh the target account’s identity or sign in again and check required pages, actions and restricted capabilities. Use Permission Audit to check authorization history.',
    },
    transferEmployee: {
      title: 'Department or position changes',
      description:
        'Update organizational membership or position in Employees, then review access separately. Changing those fields neither removes old work permissions nor grants new work permissions automatically.',
    },
    disableAccount: {
      title: 'Suspend system use',
      description:
        'Use the account status controls in Accounts when sign-in needs to be suspended, and verify the result. Account status and employee records are maintained separately. Protected system accounts have additional restrictions.',
    },
    handleResignation: {
      title: 'Handle resignation',
      description:
        'After recording resignation, check the bound account’s status and effective access. Review unbound accounts separately for suspension. If employment status is restored, recheck the account instead of assuming previous access is still appropriate.',
    },
    reviewAccountHistory: {
      title: 'Preserve the history needed for review',
      description:
        'Historical business records may still need employee and account references. Check relationships before changes and maintain status as appropriate. Use account and permission audit history instead of recreating or deleting records merely to suspend access.',
    },
    cannotSignIn: {
      title: 'Why can an employee record not sign in?',
      description:
        'An employee record does not provide sign-in access. Confirm that a separate account exists, then check its username, password and status. A staff number or employee name is not necessarily the login username.',
    },
    missingMenus: {
      title: 'Why can an account sign in but not see a menu?',
      description:
        'Check which account is signed in and review its preset and direct grants. Refresh identity or sign in again after saving permissions. Membership in the same department does not imply equal account permissions.',
    },
    cannotPerformAction: {
      title:
        'Why is an action unavailable, or access still present after removal?',
      description:
        'Check the required action permission, record state and protected account restrictions. If access remains after removing a direct grant, check preset inheritance and broader parent grants instead of relying on one checkbox.',
    },
    bindingOrServerError: {
      title: 'What about binding failures, 403 or 500?',
      description:
        'For binding failures, check the employee record and existing account binding. For 403, check page and action permissions. For 500, record the full URL, time and triggering steps for maintenance staff. Do not broaden authorization simply to rule out an error.',
    },
  },
} as const
