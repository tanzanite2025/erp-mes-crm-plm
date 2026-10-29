export const attendanceManagementOperationGuide = {
  title: 'Attendance Management Operation Guide',
  domainLabel: 'Organization and Personnel Handbook',
  introduction:
    'Prepare employee records, learn how to request leave and connect attendance devices, and understand the data behind the employee ranking. Follow each chapter and check results on the relevant management page.',
  mobileIntroduction:
    'Learn leave requests, device setup and ranking rules, with a direct leave request form.',
  shortcutDescription:
    'Leave preview and submission, device employee matching, sync checks and ranking rules.',
  contentsLabel: 'Attendance guide chapters',
  readingAreaLabel: 'Attendance guide reading area',
  stepsLabel: 'Steps and checkpoints',
  exampleLabel: 'Example',
  completionLabel: 'Completion check',
  referenceTitle: 'Open a management page',
  referenceDescription:
    'Only pages available to your account appear here. Configure devices, mappings and record queries on their management pages.',
  actions: {
    successNavigationHint:
      'Successful submission opens Leave Management. Previewing, closing or a failed submission keeps you in this guide.',
    loadingForm: 'Loading the leave form…',
  },
  references: {
    employees: 'Maintain employee records',
    leave: 'Open Leave Management',
    devices: 'Open Attendance Devices',
    ranking: 'View employee ranking',
  },
  chapters: {
    overview: {
      label: 'Where to start',
      shortLabel: 'Start here',
      title: 'Prepare employee records, then choose your workflow',
      description:
        'Employee records support leave requests, device employee matching and ranking. Leave requests and device integration can be handled independently.',
      noticeTitle: 'Understand the purpose of each data source',
      noticeDescription:
        'Leave records track applications, device events help verify clock activity and employee matching, and the employee ranking follows its current scoring rules. Chapter four explains the ranking basis.',
      example:
        'Create a new employee with a name, staff number and department. Submit leave when needed, and check the device number mapping before using an attendance terminal.',
      completion:
        'Find the employee, verify the staff number, and know where to check leave requests, device events and ranking results.',
    },
    leave: {
      label: 'Requesting leave',
      shortLabel: 'Leave',
      title: 'Select an employee, preview duration and submit',
      description:
        'The button below opens the existing leave form. The applicant employee and the signed-in account submitting the request are recorded separately.',
      noticeTitle: 'A preview still needs submission',
      noticeDescription:
        'Previewing only calculates duration. A successful submission creates a Pending request. The current leave page provides viewing and cancellation; it has no direct approve or reject controls.',
      example:
        'Choose personal leave from 09:00 to 18:00, preview the duration, enter a reason and submit. Check the employee and Pending status in Leave Management after it opens.',
      completion:
        'Verify the employee, leave type, times and reason in the details. Cancellation requires a Pending request submitted by your current account.',
    },
    devices: {
      label: 'Connecting attendance devices',
      shortLabel: 'Devices',
      title: 'Configure a device, then verify matching and event ingestion',
      description:
        'Use Attendance Devices for binding, prechecks, synchronization and number mappings. Verify one device and one employee before expanding the setup.',
      noticeTitle: 'Saved configuration and prechecks need field verification',
      noticeDescription:
        'Adapter capabilities differ by protocol. ISUP / EHOME prechecks validate configuration; the gateway and physical device still require registration and event testing. Other protocols showing Waiting for Adapter need collection integration.',
      example:
        'If the device number is 0007 and the staff number is EMP007, use Bind Device Employee to map 0007 on that device to the correct employee. Make a real clock event and verify its name and timestamp.',
      completion:
        'Check the precheck or sync response, confirm a real event was received and verify that it shows the correct employee and Matched status.',
    },
    ranking: {
      label: 'Reading the employee ranking',
      shortLabel: 'Ranking',
      title: 'Read the ranking with its data sources in mind',
      description:
        'The page displays the top three and a detailed list with names, departments, leave days, tenure and scores. The server calculates all scores.',
      noticeTitle: 'The current ranking uses a fixed 22-day basis',
      noticeDescription:
        'The current ranking totals all approved leave, without a monthly filter, and does not use device clock events for the attendance rate. Monthly attendance, lateness and payroll require their own business rules.',
      example:
        'An employee with 2 approved leave days and 5 years of tenure has an attendance rate of about 90.9%, displayed as about 91.0%, and a score of about 85.5. Use the actual server response as the result.',
      completion:
        'Explain the sources of leave days and tenure. When figures look wrong, check the employee joining date and approved leave records first.',
    },
    troubleshooting: {
      label: 'Troubleshooting',
      shortLabel: 'Help',
      title: 'Check employees, requests, devices and access',
      description:
        'Identify the failing step and inspect its management page. Keep relevant error information for investigation.',
      noticeTitle: 'Check existing records when submission is uncertain',
      noticeDescription:
        'After a connection interruption or timeout, check Leave Management for a created request before resubmitting. For device issues, keep the precheck and sync messages.',
      example:
        'If an event has no employee name, check its device number and then the manual mapping and automatic matching field for that device. Verify a subsequent new event after saving a mapping.',
      completion:
        'Identify missing records, invalid times, collection issues, number mapping or access problems. Provide the page URL, time and error message when requesting assistance.',
    },
  },
  topics: {
    prepareEmployees: {
      title: '1. Prepare and verify employee records',
      description:
        'Maintain names, staff numbers, departments and joining dates in Personnel Management. Distinguish employees sharing a name by staff number. Joining dates affect ranking tenure. Read the Organization and Account Operation Guide for organization and account setup.',
    },
    chooseWorkflow: {
      title: '2. Choose the workflow for your task',
      description:
        'Use the leave chapter for time off, the device chapter for terminals, and the ranking chapter for scores and display results. Device configuration and bulk employee maintenance belong on their management pages.',
    },
    understandDataSources: {
      title: '3. Check results on management pages',
      description:
        'Leave Management shows requests and statistics submitted by the current account. Devices shows collected events and matching. Ranking uses employee records and all approved leave totals.',
    },
    chooseApplicant: {
      title: '1. Select the employee and leave type',
      description:
        'Open New Leave Request and search by name, staff number, department, position or phone. Resigned employees are excluded. Choose the leave type and verify the applicant. Your account can submit on behalf of an employee without being bound to that employee.',
    },
    previewDuration: {
      title: '2. Enter times and preview the duration',
      description:
        'The end must be after the start. Preview Duration returns the server calculation. It currently converts elapsed time using 24 hours per day, rounds up to half days and applies a minimum of half a day. Weekends, holidays and breaks are not deducted. Preview again after changing times.',
    },
    submitRequest: {
      title: '3. Enter a reason and submit',
      description:
        'Verify the employee, leave type and times, enter a reason and select Submit Request. The system recalculates before submitting. Success opens Leave Management from this guide. On failure, follow the error message and correct the retained draft.',
    },
    trackAndCancel: {
      title: '4. Track status and cancel when needed',
      description:
        'Filter by status or leave type, change the sort order and open details. Only Pending requests submitted by the current account can be canceled. Approved, Rejected and Canceled records do not offer cancellation. Pending means the request was saved; follow the actual business process for approval handling.',
    },
    configureDevice: {
      title: '1. Bind a device with its actual protocol',
      description:
        'Open Attendance Devices, select Bind Device and choose a template. Verify the code, name, address, port, collection mode, time zone and credentials. Replace template example values with actual site settings. For ISUP / EHOME, verify the registration ID, ISUP Key and gateway ingress token.',
    },
    matchEmployees: {
      title: '2. Map device numbers to employee records',
      description:
        'Automatic matching can use staff number, identity number, phone or employee ID. The device employee field must match the incoming event field. If numbers differ, use Bind Device Employee or the unmatched list to map a device and number to an employee. Manual mappings take priority; verify subsequent events after saving.',
    },
    checkConnection: {
      title: '3. Run a precheck and complete collection setup',
      description:
        'Run the device card precheck and read its response. Hikvision ISAPI supports connectivity checks and pulling. ISUP / EHOME relies on gateway registration and pushes, requiring authentication and real card or face events to be tested. Sync availability and results depend on the actual protocol and response.',
    },
    verifyEvents: {
      title: '4. Verify recent events with a real clock action',
      description:
        'Check the latest sync time, messages and recent events. Verify timestamps, device employee numbers, employee names and match status. For unmatched events, check mappings first. For no events, check the collection path first. Event and unmatched lists refresh periodically; reopening the page also lets you verify results.',
    },
    readRanking: {
      title: '1. Read the top three and detailed list',
      description:
        'Open the employee ranking and review the cards and detailed department, leave, tenure and score values. Results sort by descending score, then attendance rate, then name for ties.',
    },
    checkRankingInputs: {
      title: '2. Check leave and joining dates',
      description:
        'Leave days total all approved applications; Pending, Rejected and Canceled requests are excluded. Tenure counts complete years from the joining date, or zero when no date is set. Reload the ranking after source data changes.',
    },
    understandRankingCalculation: {
      title: '3. Understand the attendance rate and score',
      description:
        'Attendance rate = max(0, (22 − approved leave days) ÷ 22). Score = attendance rate × 50 + min(tenure years, 10) × 2 + 30. Display values are rounded, while scoring uses the original rate, so calculations from the displayed percentage may differ slightly.',
    },
    missingEmployee: {
      title: 'Cannot find an applicant or mapping target',
      description:
        'Check the employee exists and the staff number is correct in Personnel Management. The leave picker excludes resigned employees and supports name or staff number search. Preserve leading zeros in device numbers, such as 0007 versus 7.',
    },
    leaveFailure: {
      title: 'Preview, submission or cancellation fails',
      description:
        'Check the employee is valid, both times are provided, the end is later than the start and a reason is entered. A successful preview still needs submission. Only Pending requests submitted by the current account can be canceled. Leave lists are isolated by submitting account.',
    },
    missingDeviceEvents: {
      title: 'A saved device has no events or unmatched employees',
      description:
        'Read the precheck and sync messages, then verify addresses, credentials, protocol and collection integration. For ISUP / EHOME, inspect gateway registration and pushes on site. For unmatched events, check fields or create a manual mapping. Verify new events afterward; do not assume historical events were automatically repaired.',
    },
    accessOrServerError: {
      title: 'Missing entries, actions or a 500 error',
      description:
        'Guide access and business page access are separate. Requesting leave also requires organization and personnel access; device changes require the device management action permission. Ask an administrator to check access. For a 500 error, record the full page URL, time and message for investigation.',
    },
  },
}
