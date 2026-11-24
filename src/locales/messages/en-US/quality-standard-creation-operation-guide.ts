export const qualityStandardCreationOperationGuide = {
  title: 'How to Create a Quality Standard',
  domainLabel: 'Quality Handbook',
  introduction:
    'Configure a product controlled protocol as Inspection Station → Weight Item → Grade Rules, save a draft, then complete approval and publication. Authorized accounts can open the creation dialog here or use the related page links in each chapter.',
  mobileIntroduction:
    'Five steps from preparation to publication. Authorized accounts can create here. Related page links appear below each chapter.',
  contentsLabel: 'Quality standard creation guide chapters',
  readingAreaLabel: 'Quality standard creation guide content',
  prerequisiteLabel: 'Before you begin',
  stepsLabel: 'Steps',
  resultLabel: 'Expected result',
  questionLabel: 'Common question',
  referenceTitle: 'Open related pages',
  referenceDescription:
    'Authorized accounts can create standards and manage stations here. Open the standards list to view existing standards, approve and publish. Only pages accessible to your account are shown.',
  businessEntryHint:
    'Select a product, configure inspection stations, weight items and grades, then save a draft quality standard.',
  quickCreate: 'Create Quality Standard',
  quickCreateLoading: 'Loading the standard creation form…',
  readGuide: 'Standard Creation Guide',
  references: {
    products: 'View Products',
    productGuide: 'How to Create a Product',
    standards: 'Open Quality Standards',
  },
  chapters: {
    preparation: {
      label: 'Prepare Records',
      shortLabel: 'Prepare',
      title: 'Identify the product the standard applies to',
      description:
        'A controlled protocol belongs to one product and contains one or more inspection items. Each item has a station, name, center value, unit and lower/upper deviation limits for each grade.',
      prerequisite:
        'Have the product record and confirmed inspection requirements ready, with access to the relevant pages and actions. Example values illustrate the form; use approved requirements for actual products.',
      result:
        'The product is selectable and the inspection requirements, units and stations are ready.',
      question: 'Can I create a standard before creating the product?',
      answer:
        'Create the product in Product Management first, then add a protocol from this guide or the standards list. The product creation guide explains the required records.',
    },
    criteria: {
      label: 'Add Inspection Items',
      shortLabel: 'Items',
      title: 'Select a product and enter its inspection requirements',
      description:
        'Click Create Quality Standard in this guide or Add Controlled Protocol in the standards list. Select the product and inspection station, add weight items within the station, then configure grades within each item.',
      prerequisite:
        'The product exists and you know what each measurement checks and where it occurs.',
      result:
        'The protocol has at least one clearly named inspection item with an appropriate station.',
      question: 'How does an inspection station differ from an item name?',
      answer:
        'The station identifies where inspection takes place; the item names the measurement. For example, Forming Inspection Station is a station and Formed Weight is an item. Forming, machining, fine inspection and painting stations are provided by default and can be configured in Manage Stations. Each weight item belongs to an active station and owns its grade rules.',
    },
    grading: {
      label: 'Set Values and Grades',
      shortLabel: 'Grades',
      title: 'Configure grades with a center and lower/upper deviations',
      description:
        'Each item has its own grade names, count, lower/upper deviations and pass/fail decisions. The default S/A/B grades can be changed, including a range for the first grade. Deviations share the center unit.',
      prerequisite:
        'Confirm the center, unit and grade requirements. Order grades from strict to broad with nonnegative lower and upper deviations that each increase. Names must be unique; a failing grade cannot be followed by a passing grade.',
      result:
        'Every item has valid values and units, with clear grade boundaries.',
      question:
        'Which grade includes a boundary, and what happens outside all ranges?',
      answer:
        'The first matching grade in list order applies, including its boundaries. Values outside every range fail. Rework, concession and scrap are decided separately through abnormality disposal.',
    },
    draft: {
      label: 'Save and Verify',
      shortLabel: 'Save',
      title: 'Save a draft and check its details',
      description:
        'Saving creates a draft quality standard. Verify the product and inspection rules before submitting it for approval.',
      prerequisite:
        'Select a product and enter at least one item with a name, center, unit and deviations for each grade.',
      result:
        'The new standard appears as Draft, with the expected product, items, units and grading rules.',
      question:
        'What if saving fails or the new standard is missing from the list?',
      answer:
        'Read the error, correct the form and retry. After a successful save, clear the search and select Draft or All Standards to locate the product and protocol name.',
    },
    publication: {
      label: 'Approve and Publish',
      shortLabel: 'Publish',
      title: 'Complete approval, then publish the standard',
      description:
        'Submit the draft for review by the current approver in the configured workflow. Publication is a separate action after all approval levels are complete.',
      prerequisite:
        'Verify the draft, configure the approval workflow and approvers, and ensure the account has the required permissions.',
      result:
        'The list and details show Published. Enter batch measurements in Quality Inspection to calculate grades and preserve the standard version, rule snapshot and per-item decisions.',
      question: 'Does saving or approval automatically publish the standard?',
      answer:
        'Saving creates a Draft. Successful review produces Approved status. Complete the Publish action and confirm Published status to finish. Published standards cannot be edited directly; archive them when needed to retain their history.',
    },
  },
  topics: {
    product: {
      title: 'Confirm the product identity',
      description:
        'Check the product name, model and specifications in Product Management. Keep requirements for different products in separate protocols. Create missing products first.',
    },
    stages: {
      title: 'Prepare inspection stations',
      description:
        'Open Manage Stations from the creation dialog or standards list. Authorized staff can add stations or update their names, order and availability. Close station management to continue the standard. Select active stations for new items.',
    },
    units: {
      title: 'Confirm available measurement units',
      description:
        'The center and deviations share a unit, such as g or mm. Select an active configured unit. Have authorized staff maintain missing units in Basic Settings before proceeding.',
    },
    create: {
      title: 'Add a protocol and select the product',
      description:
        'Click Create Quality Standard in this guide or Add Controlled Protocol in the standards list, then select the target product. Check the selection before entering inspection requirements.',
    },
    item: {
      title: 'Add weight items within a station',
      description:
        'Choose an active Station for New Weight Item and click Add Weight Item, or add directly within an existing station group. Enter the name, center and unit, then configure grades inside the item. Items keep independent rules. Removing a grade affects only its own item.',
    },
    stageSnapshot: {
      title: 'Check station and item names',
      description:
        'Check station and item names before saving. Reselect a renamed station before saving. Inactive stations cannot be used when saving or submitting for approval.',
    },
    center: {
      title: 'Enter the center and unit',
      description:
        'For a target rim weight of 450 g, enter 450 as the center and select g. Keep units out of numeric fields and distinguish the target from its deviation limits.',
    },
    deviations: {
      title: 'Configure grade names, deviations and decisions',
      description:
        'Add, remove or rename grades and set separate lower/upper deviations and pass/fail decisions. Asymmetry is supported: Excellent may allow −1/+2 g and Acceptable −5/+8 g. Enter deviation amounts rather than endpoints such as 449 or 458.',
    },
    example: {
      title: 'Check grading with example measurements',
      description:
        'For center 450 g, A = 5 g and B = 8 g: 450 g is S; an absolute deviation above 0 and up to 5 g is A (445 or 455 g); above 5 and up to 8 g is B (442 or 458 g); below 442 or above 458 g fails; disposal is confirmed separately. S/A/B is only an example and may be renamed or given different ranges.',
    },
    check: {
      title: 'Check every item before saving',
      description:
        'Confirm the product, remove extra items and add any missing measurements. Check names, centers, units and increasing lower/upper deviations. Then confirm the form using the button at the bottom.',
    },
    save: {
      title: 'Confirm the draft was created',
      description:
        'Wait for the success message. The dialog closes and you stay in the guide; use Open Quality Standards to check the new draft. The system generates the protocol code, a product-based standard name and an initial version, with Draft status. Closing an unsaved form does not create a standard.',
    },
    revise: {
      title: 'Review details and make corrections',
      description:
        'Open the standard details and review weight items and grades by station. Draft and Rejected standards can be edited. Changing an item station preserves its weight and grades. Save corrections and check the details again.',
    },
    submit: {
      title: 'Submit for approval',
      description:
        'Use Submit for Approval in the standard details. If the workflow or approvers are missing, complete configuration and retry. Confirm that an approval request exists and the standard is Pending Approval.',
    },
    review: {
      title: 'Have the current approver review it',
      description:
        'The current approver checks the product and inspection requirements, then approves or rejects. Complete multiple approval levels in order. Revise rejected standards according to feedback before resubmitting.',
    },
    publish: {
      title: 'Publish and confirm the final status',
      description:
        'After all approval levels pass, publish the standard and confirm Published status. Archive it through the workflow when it should leave use, and review the operation history for records.',
    },
  },
} as const
