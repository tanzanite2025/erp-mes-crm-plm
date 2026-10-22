export const productCreationOperationGuide = {
  title: 'How to create a product',
  launcherDescription:
    'Reuse a template and base model to create the product. Link its BOM separately after validation.',
  openWizard: 'Start / continue setup',
  guidedCreation: 'Guided setup',
  readHandbook: 'Operation guide',
  productManagementEntryHint: 'Need help? Create a product step by step.',
  previousStep: 'Previous step',
  stepNavigation: 'Product creation steps',
  templateIncludesAttributes: 'Attributes included in this template',
  templateReuseHint:
    'Confirm to reuse the template attributes and required settings without configuring them again.',
  noTemplatesAvailable:
    'No active template is available. Ask the person responsible for templates to check the setup before continuing.',
  upstreamChangeHint:
    'Changing this configuration requires confirming later steps again. Saved business records are retained.',
  optionalBomDescription:
    'The product has been created, so you can finish this operation now. A BOM is essential for product lifecycle management and can be prepared and validated separately, then linked to this product once confirmed.',
  bomComplete: 'BOM saved',
  finish: 'Finish and close',
  saveProductAndContinue: 'Save product and continue',
  stepLabels: {
    template: 'Template',
    baseModel: 'Base model',
    product: 'Save product',
    bom: 'BOM (link later)',
  },
  description:
    'Select a template and base model, then fill in and save the product details. BOM preparation, validation and linking can be separate operations. Link the BOM once it has been validated and confirmed.',
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
  domainLabel: 'Products · Operation Guide',
  progress: 'Product setup: {{completed}} / 3 steps complete',
  completed: 'Completed',
  current: 'In progress',
  pending: 'Complete earlier steps first',
  skipped: 'Not needed now',
  start: 'Start this step',
  continue: 'Continue',
  review: 'Review result',
  close: 'Continue later',
  confirmAndContinue: 'Confirm and continue',
  selectExisting: 'Use existing configuration',
  manageAttributes: 'Create or manage attributes',
  createBaseModel: 'Create category or base model',
  baseModelMeaningTitle: 'Shared base models and specific product cards',
  baseModelMeaning:
    'A base model, such as R50, is a shared model identifier used to group similar products. Create separate products under the same model when different customer requirements or BOM configurations need to be managed separately. Each saved product has its own card and can be linked to its corresponding BOM.',
  baseModelProductCardExample:
    'For example, R50 (Disc brake) and R50 (V-brake) share the R50 base model, with their own specifications and BOMs. Card names follow Final Model Preview in the product editor.',
  baseModelProductAndBomTiming:
    'This step selects the base model. Create the specific product in the next step. Save the product first and link its BOM separately after validation and confirmation.',
  baseModelCreateHelp:
    'To create a base model, select a level 2 parent, enter its name in Category Name and its code in Category Code, then link the template selected in the previous step. If level 1 or 2 categories are missing, create them in the same dialog first. You can also add models through Product Management → Edit Category → Add Category. Reuse an existing model when suitable.',
  selectAttributes: 'Select the level 1 attribute categories for this product',
  attributeCategory: 'Attribute category',
  noAttributes: 'No additional attributes are needed',
  selectTemplate: 'Select product template',
  selectBaseModel: 'Select a level 3 base model',
  baseModelSelectionRule:
    'Product categories follow Level 1 → Level 2 → Level 3 base model (such as R50). This list includes only active level 3 models that resolve to the template selected in the previous step. Level 1 and 2 categories organize the hierarchy and do not appear here.',
  baseModelCatalogSummary:
    'Loaded: {{levelOneCount}} level 1 categories, {{levelTwoCount}} level 2 categories, {{baseModelCount}} level 3 base models; {{availableCount}} available in this step.',
  baseModelCatalogEmpty:
    'The product category list returned no records. Use Create category or base model below to build the hierarchy. If categories were created on another computer, reload to check first.',
  baseModelMissingSecondLevel:
    'Only level 1 categories exist; level 2 categories and level 3 base models are missing. Use Create category or base model below, select an existing level 1 parent, and save a level 2 category. Open it again, select the level 2 parent, enter a model name and code, and link the template selected in the previous step.',
  baseModelMissingThirdLevel:
    'Level 1 and 2 categories exist, but no level 3 base model has been created. Use Create category or base model below, select a level 2 parent, enter the model name and code, and link the template selected in the previous step.',
  baseModelInactiveCount:
    '{{count}} level 3 base models are inactive and are not listed. Review them under Product Management → Edit Category and activate them when appropriate.',
  baseModelUnresolvedTemplateCount:
    '{{count}} active level 3 base models do not resolve to an available template and are not listed. Review the model and its parent template links under Product Management → Edit Category.',
  baseModelOtherTemplateCount:
    '{{count}} active level 3 base models use another template instead of “{{template}}” and are not listed. Use Select template in the step navigation to choose the matching template, or review template links under Product Management → Edit Category.',
  baseModelSelectionUnavailable:
    'The previous selection no longer exists, is inactive, or does not meet this step’s level 3 model and template requirements. Select another model. To change templates, use Select template in the step navigation.',
  baseModelSelectedStructuralCategory:
    'The current record is a level 1 or 2 category used for grouping. Follow the guidance above to complete the hierarchy and select a level 3 base model before continuing.',
  baseModelCatalogLoadFailed:
    'Product categories could not be loaded, so available base models cannot be determined. Reload to retry; a failed request does not mean the categories have not been created.',
  baseModelTemplateLoadFailed:
    'Templates could not be loaded, so models cannot be matched to the previous selection. Reload to retry.',
  productBaseModelUnavailable:
    'The base model selected in the previous step could not be found. Use Base model in the step navigation to return to step 2, check the category hierarchy, active status and template, and select again. A level 1 category alone is insufficient to create a specific product.',
  selectPlaceholder: 'Please select',
  emptyOptions: 'No configuration available. Create one to continue.',
  selectedResult: 'Configuration used for this task',
  requiredAttribute: 'Required',
  optionalAttribute: 'Optional',
  optionCount: '{{count}} available options',
  noActiveAttributeOptions:
    'No active level 2 attribute options are available.',
  templateMismatch:
    'This template does not include all attributes selected earlier. Select a matching template or create one.',
  baseModelMismatch:
    'The base model resolves to a different template. Select or configure a matching base model.',
  savedBaseModelTemplateMismatch:
    'The category was saved, but this base model uses a different template from the previous step. Check its template configuration. You do not need to create it again.',
  savedBaseModelConfirmationFailed:
    'The category was saved, but template verification failed. Click “Confirm and continue” to retry verification without creating another record. Reason: {{message}}',
  missingAttributeOptions:
    'Each selected category needs at least one active level 2 option.',
  loading: 'Loading business configuration…',
  loadFailed: 'Could not load configuration. Please retry.',
  retry: 'Reload',
  saveFailed: 'Could not save: {{message}}',
  confirmed: 'Step completed. Continue with the next step.',
  productComplete: 'Product created',
  productCompleteDescription:
    'The product details have been saved. You can finish product creation now and link its BOM separately after validation and confirmation.',
  viewProduct: 'View product record',
  viewBom: 'Open BOM Formulas',
  createBom: 'Continue with a BOM',
  skipBom: 'Finish without a BOM',
  startAnother: 'Create another product',
  startAnotherDescription:
    'Starting another task clears this page’s progress. Saved business records are retained.',
  startAnotherConfirm: 'Start a new product setup task?',
  confirm: 'Confirm',
  cancel: 'Cancel',
  storageHint:
    'Progress is saved for the current account in this browser. Return to this tab to continue.',
  storageFailed:
    'This browser could not save progress. You may need to select the configuration again after leaving this page.',
  savedResult: 'Saved result',
  recordVerificationHint:
    'Completion is checked against current business records. Local progress restores your place in the guide.',
  productVerificationChecking: 'Checking the product record…',
  productVerificationFailed:
    'Could not verify the product record. Retry; your local progress has been retained.',
  productVerificationUnavailable:
    'Product page access is required to verify the product record.',
  productRecordMissing:
    'This product record no longer exists and cannot be marked as created.',
  returnToProductStep: 'Return to the product step',
  bomVerificationChecking: 'Checking BOMs currently linked to the product…',
  bomVerificationFailed:
    'Could not verify the BOM association. Retry; your local progress has been retained.',
  bomVerificationUnavailable:
    'BOM page access is required to verify its associations.',
  productCode: 'Product code',
  bomProductMismatch: 'Select the product created in this task.',
  productBaseModelMismatch: 'Select the base model confirmed in this task.',
  handbook: {
    contentsLabel: 'On this page',
    sections: {
      productRecord: 'Product details',
      classification: 'Models and cards',
      workflow: 'Creation steps',
      displayMapping: 'Display and maintenance',
      references: 'Configuration reference',
    },
    referenceTitle: 'Configuration reference and maintenance',
    introduction:
      'Confirm the level 3 base model, fill in the template specifications and save the specific product. One base model can contain several product cards. Card names correspond to the aggregate preview in the product editor. Link a BOM to the specific product after validation and confirmation.',
    productRecordTitle: 'What a product record contains',
    viewExistingProducts: 'View existing products',
    existingProductsHint:
      'Search, view and edit existing products in Product Management.',
    viewPage: 'View {{page}}',
    productRecord: {
      identity: {
        title: 'Base model and product identity',
        description:
          'The level 3 base model, such as R50, groups products. Each newly saved product appears as its own card under that model, with its own specifications and linked BOMs.',
      },
      specifications: {
        title: 'Specifications and attributes',
        description:
          'The template linked to the base model defines specifications and required attributes, such as Brake Type, Process Series and Tire Type. Selected values contribute to the product name and card labels.',
      },
      supportingInformation: {
        title: 'Images and supporting information',
        description:
          'Add a product thumbnail, status and production restrictions. Link a process specification or mold group as needed.',
      },
      bom: {
        title: 'BOM · Product lifecycle management',
        description:
          'A BOM is essential for managing the product lifecycle, material composition, versions and upgrades. Create the product first and link its BOM after validation and confirmation. These are separate operations.',
      },
    },
    classificationExample: {
      title: 'From category levels to specific product cards',
      levelOne: 'Carbon fiber rims (level 1)',
      levelTwo: 'Mountain bike rims (level 2)',
      levelThree: 'R50 (level 3 base model)',
      productsLabel: 'Separate products created and saved under R50',
      discBrake: 'R50 (Disc brake)',
      rimBrake: 'R50 (V-brake)',
      description:
        'R50 is the shared level 3 base model. Disc brake and V-brake identify specification differences between specific products. Reuse R50 when creating another product with different specifications and save it as a separate product card.',
    },
    displayMapping: {
      title: 'What each part of the page represents',
      description:
        'Categories, product names, specification labels and BOM labels have their own maintenance locations. Check the aggregate name in Final Model Preview at the bottom of the product editor.',
      columns: {
        display: 'On the page',
        meaning: 'What it represents',
        location: 'Where to maintain or check it',
      },
      rows: {
        classification: {
          display: 'Category levels and the R50 heading',
          meaning:
            'Levels 1 and 2 organize product families. Level 3 is the base model you name. Several specific product cards can belong to R50.',
          location:
            'Product Management → Edit Category → Add Category. Select a level 2 parent, then enter Category Name and Category Code to create a level 3 base model. Maintain the hierarchy and template association in the category dialog.',
        },
        productCard: {
          display: 'Each product card under R50',
          meaning:
            'Each card is a separately saved product record with its own specifications and linked BOMs. Products sharing a level 3 base model appear together under that model.',
          location:
            'Product Management → Generate Product. Select R50, enter the two-digit model code, specifications and attributes, then save. Use the settings control on the card to edit that product.',
        },
        namePreview: {
          display: 'Card name, such as R50 (Disc brake)',
          meaning:
            'The existing naming rules combine the base model and relevant specifications. R50 is the level 3 base model, while Disc brake is the selected brake type. Check the preview for the complete name.',
          location:
            'Create or edit a product → Final Model Preview at the bottom. Review the aggregate name and labels as you fill in specifications, then save.',
        },
        productAttributes: {
          display: 'Specification labels such as Process Series and Tire Type',
          meaning:
            'These values come from the product specifications entered through its template, such as Standard Series or Hooked. The name and remaining labels together describe the product card.',
          location:
            'Fill in the selected template’s fields when creating or editing a product. Maintain attributes and choices directly in that template. Each template owns its configuration, and each product stores its own selections.',
        },
        bomAttributes: {
          display: 'BOM type, ownership, customer, grade and finished weight',
          meaning:
            'These values come from BOMs linked to the specific product. Customer ownership applies to customer-specific BOMs. Grade, finished weight, material composition, versions and upgrades are maintained in the BOM.',
          location:
            'BOM Formulas → Find or create a BOM for the specific product, check the linked product and maintain its details. Save the product first and link its BOM after preparation and validation.',
        },
      },
      unboundHint:
        'Unbound means that no value is currently available to display for that item. Maintain product specifications in the product editor. Check BOM links and details in BOM Formulas. The product can be created first, with its BOM linked after validation and confirmation.',
    },
    topics: {
      template: {
        title: 'Templates · Define what to fill in',
        description:
          'A template maintains shared form rules for a product family. Select an existing one during setup.',
        first:
          'Add existing level 1 attribute categories, mark required attributes and review their level 2 options.',
        second:
          'Products in the same family reuse existing templates, maintained by the person responsible for configuration.',
      },
      attributes: {
        title: 'Attributes · Define available choices',
        description:
          'Maintain attribute names and options first. The template determines which attributes a product family uses.',
        first:
          'Level 1 categories define dimensions, such as Material or Process Series.',
        second:
          'Level 2 options define values, such as Carbon Fiber or Standard Series, selected when creating a product.',
      },
      appearance: {
        title: 'Appearances · Show the visual result',
        description:
          'Use names, descriptions and reference images to make different appearances easy to view and identify.',
        first:
          'Upload reference images of textures or paint finishes. Thumbnails appear in the catalog.',
        second:
          'Maintain barcode values, active status and sort order. Update descriptions or replace images on existing appearances.',
      },
    },
    workflowTitle: 'Create the product, then link its BOM separately',
    workflowSteps: {
      template:
        'Select an existing product template and review its specifications, attributes and required fields.',
      baseModel:
        'Select an existing level 3 base model, such as R50. To create one, open Edit Category → Add Category, select a level 2 parent, enter the model name and category code, then link its template.',
      product:
        'Open Generate Product, select the base model, fill in the two-digit model code and specifications, review Final Model Preview at the bottom, then save a separate product card.',
      bom: 'After saving the product, prepare and validate the BOM separately. Once confirmed, link the specific product represented by the card in BOM Formulas and maintain materials, grade, weight and other details.',
    },
    workflowHint:
      'Reuse existing categories, base models and templates. To create another product under the same model, select that level 3 model again, enter the specifications and save a separate record. Each product card has its own details and BOM links.',
  },
  steps: {
    attributes: {
      title: 'Prepare the two levels of product template attributes',
      action:
        'Edit the relevant product template to add attributes (e.g. Material) and options (e.g. Carbon Fiber), and configure required status, availability and order. Each template is maintained independently and saved with its definitions.',
      fields:
        'Chinese names for level 1 and level 2 attributes. Add English names and descriptions as needed. Internal identifiers are generated automatically.',
      result:
        'Level 1 attribute dimensions and their level 2 selectable options are available. Next, add the level 1 categories to a product template.',
    },
    template: {
      title: 'Select a product template',
      action:
        'Select an existing product template, review its attributes and required settings, then continue.',
      fields:
        'The template to use, its included attributes and required settings.',
      result:
        'The template defines the specifications and attributes shown when creating a product. Next, associate it with a base model.',
    },
    baseModel: {
      title: 'Confirm the base model',
      action:
        'Base models come from level 3 of the product category tree. This list shows active models using the template selected in the previous step. To add one, click Create category or base model below and enter its details.',
      fields:
        'Select an existing level 3 base model. To add one, select a level 2 parent, enter the model name in Category Name and the base model code in Category Code, then link its template.',
      result:
        'The product form can select this base model and resolve its template. Next, create the specific product.',
    },
    product: {
      title: 'Create and save the product',
      action:
        'Use the confirmed base model, fill in the template specifications and attributes, then save to complete product creation. Link its BOM separately after validation and confirmation.',
      fields:
        'Base model, two-digit model code, template specifications and required attributes. Add images, attachments and notes as needed.',
      result:
        'The product details, generated name and code are saved. You can finish this operation now and link its BOM later, once validated and confirmed.',
    },
    bom: {
      title: 'Create a BOM for the saved product',
      action:
        'Once the BOM has been validated and confirmed, link the existing product in this step, review materials, categories, quantities and loss, then save. Product creation, BOM preparation and validation, and BOM linking can be separate operations.',
      fields:
        'Linked product, BOM version, ownership, grade, material lines and finished weight/unit. Select a customer for customer ownership.',
      result:
        'An EBOM draft is linked to the product. Continue review, release and manufacturing BOM derivation in the BOM module.',
    },
  },
}
