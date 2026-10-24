export const bomCreationOperationGuide = {
  title: 'How to Create a BOM',
  domainLabel: 'Product Handbook · BOM',
  introduction:
    'Follow five steps to connect a product, performance version, finished weight, and recipe, then manage approval, release, and production derivation.',
  operationStepsTitle: 'What to do in this step',
  draftEntry: {
    description:
      'Once the product exists, open the editor here to enter and save an engineering BOM draft. Closing returns to this reading step. Continue approval, release, and derivation in BOM Recipes.',
    open: 'Start a BOM draft',
    checking: 'Checking account permissions. Please wait.',
    noPermission:
      'This account lacks access to BOM Recipes or BOM management. You can read all explanations; ask an authorized user to create the BOM.',
    loading: 'Loading the BOM editor…',
    saved:
      'Draft {{bomNo}} saved. Continue viewing, approval, release, or derivation in BOM Recipes.',
  },
  operationSteps: {
    purpose: {
      prepare:
        'Save the specific product first. Materials and their units should also be available. If the product does not exist, follow How to Create a Product first.',
      open: 'Choose Enter BOM ownership, versions, weight and recipe above, or New in BOM Recipes. Both start an engineering BOM draft.',
      continue:
        'Enter the product and ownership on the left, set the performance version and weight, then edit the recipe on the right. On mobile, switch between Basic Information and Recipe Details. Choose Save Draft when ready.',
    },
    product: {
      select:
        'Select the specific product and verify its model and specifications. Select it before opening performance version settings. An existing BOM’s product cannot be changed.',
      ownership:
        'For a general internal recipe, choose Internal and leave Owner Customer empty. For a dedicated recipe, choose Customer-specific and select Owner Customer. Use the question mark beside the field for examples.',
      identity:
        'A new BOM is an EBOM; its number is generated on save. Enter the intended effective date and remarks. The date does not approve or release it. Use derivation in the final step to create an MBOM.',
    },
    performance: {
      manage:
        'After selecting the product and ownership, choose the blue settings button beside Performance Version. Select a version on the left and enter this product’s finished weight and unit on the right.',
      select:
        'Save version options, then choose the combined entry, such as Lightweight · 420 g, from the dropdown. The catalog offers names; each model does not need every version.',
      verify:
        'Compare Standard and Lightweight weights in the same scope for incorrect units or values, then save this BOM. Saving options neither saves the BOM nor saves other versions’ weight drafts in bulk.',
    },
    recipe: {
      expand:
        'Expand the groups needed in the recipe. Use Manage Shared Groups for missing categories; names, order, and activation affect the shared catalog.',
      enter:
        'Use the add entry within a group to choose materials, verify units, and enter unit usage, loss, and unit price. Add the rows you need; multiple groups can stay expanded.',
      check:
        'Check calculated usage and estimated cost against materials, units, quantities, and loss. These do not calculate finished weight. Verify version weight too, then choose Save Draft.',
    },
  },
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
    meaningTitle: 'Why is lifecycle status shown?',
    derivationTitle:
      'How to create a manufacturing BOM from an engineering BOM',
    derivationDescription:
      'Derivation creates a linked manufacturing record; it does not change the source EBOM’s type. Follow the actions currently supported by the system.',
    derivationSteps: {
      release: {
        title: 'Approve and release the engineering BOM',
        description:
          'Open and verify the engineering draft in BOM Recipes. Submit for Review currently uses direct approval and locks content. Reopen the record and choose Release Engineering. The source must be released and locked before derivation.',
      },
      derive: {
        title: 'Choose Derive MBOM on the source record',
        description:
          'Find the released EBOM in BOM Recipes and choose Derive MBOM on its row. The system creates a manufacturing draft, copies the product, ownership, version, weight, and recipe, and links it to the source. The source EBOM remains unchanged.',
      },
      verify: {
        title: 'Open and verify the manufacturing draft',
        description:
          'Open the new MBOM and verify the copied materials, groups, quantities, loss, performance version, weight, and unit for production. Adjust and save as needed. Derivation does not release the MBOM.',
      },
      publish: {
        title: 'Approve, then release manufacturing separately',
        description:
          'After verification, approve and choose Release Manufacturing. Release requires material rows, positive usage, valid materials, and a positive finished weight with a weight unit. Permissions, status, and concurrency checks still apply.',
      },
    },
    stages: {
      draft: {
        title: 'Prepare a draft',
        description:
          'Enter and save the recipe, then check the product, materials, quantities, loss, and weight. A draft can be completed later; saving it does not make it ready for production.',
      },
      confirm: {
        title: 'Verify, approve, then release separately',
        description:
          'Open the draft in BOM Recipes, verify it, and choose Submit for Review. This currently uses direct approval, resulting in Approved with locked content. Reopen the record to release it. It does not pause at In Review or release automatically on save.',
      },
      use: {
        title: 'Release and production use',
        description:
          'Approved, Released, and Obsolete records lock their content. Manufacturing and engineering BOMs remain separate. Deriving a manufacturing BOM requires the source engineering BOM to meet release conditions.',
      },
      change: {
        title: 'Revise and trace changes',
        description:
          'Use revision with a reason for a released MBOM. The current implementation creates a released revision and obsoletes the previous one while retaining history, without another draft approval stage. Use BOM Trace and change records to inspect versions and changes.',
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
