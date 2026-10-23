export const bomCreationOperationGuide = {
  title: 'How to Create a BOM',
  domainLabel: 'Product Handbook · BOM',
  introduction:
    'Learn how a BOM links a product to its materials, performance version, finished weight, and lifecycle. Select a chapter below.',
  contentsLabel: 'BOM guide contents',
  readingAreaLabel: 'BOM guide reading area',
  meaningLabel: 'Meaning',
  exampleLabel: 'Example',
  checklistTitle: 'Check before saving',
  checklistDescription:
    'Verify the current recipe before proceeding with the required review and release.',
  sections: {
    purpose: 'Understand the BOM',
    product: 'Identify the product and ownership',
    performance: 'Choose a performance version and weight',
    recipe: 'Enter the recipe by group',
    lifecycle: 'Save and manage the lifecycle',
  },
  shortSectionLabels: {
    purpose: 'BOM',
    product: 'Product',
    performance: 'Version & weight',
    recipe: 'Recipe',
    lifecycle: 'Lifecycle',
  },
  purpose: {
    title: 'First: a BOM is a product recipe',
    description:
      'BOM stands for Bill of Materials. Product records describe what a product is. The BOM describes how materials make up that product. Save the product first, then create its BOM when the recipe is ready and verified.',
    records: {
      product: {
        title: 'Specific product',
        description:
          'Different specifications under the R50 base model can be separate product records. Select the record that actually uses this recipe.',
      },
      ebom: {
        title: 'Engineering BOM (EBOM)',
        description:
          'Maintains the material composition during product design and development. The current creation entry starts with an engineering BOM, saved as a draft for further checking.',
      },
      mbom: {
        title: 'Manufacturing BOM (MBOM)',
        description:
          'Carries the material recipe used in production, derived from an engineering BOM and managed separately. Check the BOM type before comparing records.',
      },
    },
    example:
      'For example, create a Lightweight engineering BOM for a specific R50 product, recording carbon fabric, resin, their quantities, and the finished weight of this product’s Lightweight version.',
  },
  product: {
    title: 'Identify which product and customer this recipe serves',
    description:
      'Choose an existing product record, then confirm ownership. Ownership distinguishes an internal production recipe from a customer-specific recipe; customer ownership also requires selecting the customer.',
    fields: {
      effectiveDate: {
        title: 'Effective date',
        description:
          'Records when this recipe is intended to apply. The date and lifecycle status are managed separately; entering a date still requires the appropriate verification, approval, or release actions.',
      },
      product: {
        title: 'Product',
        description:
          'Select the product that uses this recipe. Check its model and specifications to avoid selecting another record under the same base model.',
      },
      ownership: {
        title: 'Ownership and customer',
        description:
          'Choose internal ownership for internal production, or customer ownership and the corresponding customer for a dedicated recipe.',
      },
      identity: {
        title: 'BOM number, type, and remarks',
        description:
          'The BOM number is generated when saved. The type identifies engineering or manufacturing use. Remarks describe conditions or maintenance notes for this recipe.',
      },
    },
    hint: 'The product, BOM type, and ownership define the recipe’s scope. Compare weights and versions within the same scope.',
  },
  performance: {
    title: 'Understand performance versions and weight together',
    description:
      'Standard, Lightweight, Ultralight, and Reinforced describe different performance configurations. The shared catalog provides available names; each product uses only the versions it needs.',
    concepts: {
      performance: {
        title: 'Performance version',
        meaning:
          'Distinguishes alternative configurations or recipes of the same specific product.',
        example: 'Standard, Lightweight, Ultralight',
      },
      revision: {
        title: 'BOM revision',
        meaning: 'Tracks iterations and subsequent changes to a BOM.',
        example: 'V1.0, V1.1',
      },
      lifecycle: {
        title: 'Lifecycle status',
        meaning:
          'Shows whether a BOM is being prepared, confirmed, used, or retired.',
        example: 'Draft, Approved, Released, Obsolete',
      },
    },
    weightTitle: 'What does BOM weight mean?',
    weightDescription:
      'Weight is the finished product weight for this BOM’s specific product, performance version, and recipe, saved with its unit. A maintainer enters it; adding material quantities does not calculate it. It is not the packed shipment weight.',
    weightScope:
      'For example, enter 480 g for a product’s Standard version and 420 g for its Lightweight version. Another product’s Lightweight version can have a different weight: the shared name has no fixed weight. Check engineering, manufacturing, internal, and customer scopes separately.',
    weightOperation:
      'Select a product, then use the management entry beside Performance Version to select or maintain a version and enter its weight and unit. The dropdown combines them, for example “Lightweight · 420 g”.',
    weightDraft:
      'Switching versions retains their weight drafts during the current session. Saving the BOM saves only the selected performance version and weight. Other temporary drafts are not saved together and do not create additional BOMs.',
    weightComparison:
      'Compare weights for the same product to spot inconsistencies. If Lightweight is heavier than Standard, check the product, recipe, weight, and unit. A catalog name does not mean the system has verified its performance or weight.',
  },
  recipe: {
    title: 'Enter materials, quantities, and loss inside groups',
    description:
      'The recipe summary shows material count, estimated cost, and used groups. Expand groups to edit their rows; multiple groups can stay open. Clicking a group heading only expands or collapses that group.',
    groupTitle: 'What does group configuration mean?',
    groupDescription:
      'Groups form a shared material classification catalog used to organize and check recipe rows, such as Preparation, Rolling, Forming, and Packaging. Each BOM uses the groups it needs; some groups may be empty.',
    groupBoundary:
      'A group name that resembles a workshop stage does not schedule operations, define a production route, or arrange production. Group names alone also do not describe actual parent-child material relationships.',
    groupShared:
      'Manage Shared Groups and the separate Group Configuration page maintain the same catalog. Names, order, default status, and activation affect the shared catalog used by all BOMs. Adding materials or editing quantities and loss inside a group changes only the current BOM draft.',
    groupDefault:
      'The default group provides a fallback when no group is specified. Adding a row inside a group places it in that group. Inactive groups no longer offer an add entry, while historical rows remain visible.',
    fields: {
      material: {
        title: 'Material and unit',
        description:
          'Choose the actual material and verify its specification and usage unit, such as square metres for fabric or kilograms for resin. Do not combine quantities with different units directly.',
      },
      usage: {
        title: 'Unit usage and loss',
        description:
          'Unit usage is the base material quantity needed for one finished product. The loss percentage accounts for additional consumption.',
      },
      standard: {
        title: 'Standard usage',
        description:
          'The system calculates unit usage × (1 + loss percentage). Usage of 2 with 5% loss gives standard usage of 2.1, retaining the material’s usage unit.',
      },
      cost: {
        title: 'Unit price and estimated cost',
        description:
          'Estimated cost sums standard usage × unit price across rows to help check the recipe. It does not calculate finished product weight.',
      },
    },
  },
  lifecycle: {
    title: 'Save the current BOM, then manage its status',
    description:
      'Saving a draft stores the product, ownership, selected performance version and weight, remarks, and material rows together. Performance version names and groups have their own shared catalogs; saving a catalog does not save this BOM.',
    stages: {
      draft: {
        title: 'Prepare a draft',
        description:
          'Enter and save the recipe, then check the product, materials, quantities, loss, and weight. A draft can be completed later; saving it does not make it ready for production.',
      },
      confirm: {
        title: 'Verify and review',
        description:
          'Confirm the recipe under your business process, then use the available status actions. Actions depend on the current status, account permissions, and business validation. Saving once does not complete every confirmation.',
      },
      use: {
        title: 'Release and production use',
        description:
          'Approved, Released, and Obsolete records lock their content. Manufacturing and engineering BOMs remain separate. Deriving a manufacturing BOM requires the source engineering BOM to meet release conditions.',
      },
      change: {
        title: 'Revise and trace changes',
        description:
          'Use revision with a reason to change an effective manufacturing recipe. Previous versions retain their history. Use BOM Trace and change records to inspect versions and changes.',
      },
    },
    layoutHint:
      'On desktop, product and BOM information appears on the left and the recipe on the right. On mobile, switch between Basic Information and Recipe Details. Switching views only changes the display; save explicitly to persist the BOM.',
  },
  checklist: {
    product:
      'Do the product record, BOM type, ownership, and customer match the intended use?',
    version:
      'Is the performance version correct and distinct from the revision and lifecycle status?',
    weight:
      'Are the weight and unit correct, and are differences between versions reasonable?',
    recipe:
      'Have you checked material specifications, groups, quantities, loss, and calculated usage?',
    save: 'Have you saved the BOM and completed any required review or release actions?',
  },
  references: {
    title: 'Related pages',
    bom: 'Go to BOM Recipes',
    groups: 'View Group Configuration',
    records: 'View BOM Trace',
    productGuide: 'Read How to Create a Product',
  },
}
