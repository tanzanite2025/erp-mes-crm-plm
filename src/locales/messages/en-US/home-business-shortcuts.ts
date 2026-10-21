export const home = {
  title: 'Home',
  tab: 'Quick Access',
  heading: 'Start your work here',
  description:
    'Follow business steps to complete your work, or find common tools by category.',
  showMore: 'View more',
  showLess: 'Show less',
  entryCount: '{{count}} shortcuts',
  emptyTitle: 'No business shortcuts available',
  emptyDescription:
    'Shortcuts will appear here when you are granted access to business modules.',
  productCreationGuide: {
    title: 'How to create a product',
    description:
      'Prepare attributes, a template and a base model, then create the product. Once saved, you can continue with its BOM.',
    reuseHint:
      'Review and reuse existing attributes, templates and base models. They do not need to be recreated for every product.',
    stepNumber: 'Step {{number}}',
    fieldsLabel: 'What to fill in',
    resultLabel: 'When finished',
    openPage: 'Open {{page}}',
    accessRequired: 'Access to this page is required',
    reusableConfiguration: 'Reuse existing setup',
    productCreated: 'Product record complete',
    optionalNext: 'Optional next step',
    steps: {
      attributes: {
        title: 'Prepare the two levels of product template attributes',
        action:
          'In Product Template Attribute Categories, maintain level 1 attribute categories (e.g. Material) and level 2 attribute options (e.g. Carbon Fiber), or reuse existing ones.',
        fields:
          'Chinese names for level 1 and level 2 attributes. Add English names and descriptions as needed. Internal identifiers are generated automatically.',
        result:
          'Level 1 attribute dimensions and their level 2 selectable options are available. Next, add the level 1 categories to a product template.',
      },
      template: {
        title: 'Configure a product template',
        action:
          'Create or select a template, add the level 1 attribute categories and mark required attributes.',
        fields:
          'Template name, description, level 1 attribute categories and required settings.',
        result:
          'The template defines the specifications and attributes shown when creating a product. Next, associate it with a base model.',
      },
      baseModel: {
        title: 'Create a base model and associate its template',
        action:
          'Prepare level 1 and level 2 categories, then add a level 3 base model under level 2 and confirm its product template.',
        fields:
          'Parent category, category name, category code and associated template. Existing categories and template settings can be reused.',
        result:
          'The product form can select this base model and resolve its template. Next, create the specific product.',
      },
      product: {
        title: 'Create and save the product',
        action:
          'Open Product Management, choose Generate Product, select the base model, fill in the specifications and attributes, then save.',
        fields:
          'Base model, two-digit model code, template specifications and required attributes. Add images, attachments and notes as needed.',
        result:
          'The saved product has a generated name and code. Product creation is complete; continue only if it needs a BOM.',
      },
      bom: {
        title: 'Create a BOM for the saved product',
        action:
          'Create an EBOM in BOM Formulas, select the saved product, add existing materials and maintain categories, quantities and loss before saving a draft.',
        fields:
          'Linked product, BOM version, ownership, grade, material lines and finished weight/unit. Select a customer for customer ownership.',
        result:
          'An EBOM draft is linked to the product. Continue review, release and manufacturing BOM derivation in the BOM module.',
      },
    },
  },
  categories: {
    product:
      'Create product records and maintain templates, attributes and BOM structures.',
    dashboard:
      'Review factory operations, the production calendar, deliveries and system activity.',
    purchaseAndSales:
      'Handle purchasing, quotations, sales orders and shipments.',
    production:
      'Connect material planning, scheduling, execution, outsourcing and piecework.',
    rawMaterials:
      'Manage raw material records, cutting plans, operations and engine settings.',
    businessAnalysis:
      'Analyze capacity, production load, quality trends and customer sales.',
    engineering:
      'Find engineering data, process documentation and technical references.',
    quality:
      'Maintain quality standards and carry out inspections, audits and quality operations.',
    warehouseAndLogistics:
      'Manage inventory, receipts, shipments, stocktakes, packaging and logistics settings.',
    assets:
      'Manage equipment, tooling, maintenance, personnel and laboratory work.',
    finance: 'Maintain financial settings and handle settlements.',
    messagesAndApproval:
      'Handle approvals and review business messages and execution records.',
    system: 'Manage system settings, master data, terminals and quick actions.',
  },
}
