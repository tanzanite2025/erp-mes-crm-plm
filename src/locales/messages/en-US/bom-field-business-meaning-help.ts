export const bomFieldBusinessMeaningHelp = {
  triggerLabel: 'Explain {{field}}',
  bomType: {
    title: 'BOM type: engineering and manufacturing',
    summary:
      'The type identifies the recipe’s purpose. Creation starts with an engineering BOM; the creation action determines the type.',
    items: {
      engineering: {
        title: 'Engineering BOM (EBOM)',
        description:
          'Records the design and development recipe. Save a draft and publish it after verification, or save and publish when creating it.',
      },
      manufacturing: {
        title: 'Manufacturing BOM (MBOM)',
        description:
          'Derived from a released, locked engineering BOM as a separate manufacturing draft. Verify its production recipe; the source EBOM remains unchanged.',
      },
    },
    instruction:
      'In BOM Recipes, find the source engineering record and choose Derive MBOM. The type cannot be switched in this field.',
  },
  ownership: {
    title: 'Ownership: who uses this recipe?',
    summary:
      'Ownership distinguishes an internal production recipe from one dedicated to a customer. Engineering and manufacturing BOMs each have their own ownership.',
    items: {
      internal: {
        title: 'Internal production',
        description:
          'Choose this when the recipe is not tied to a specific customer. Leave Owner Customer empty.',
      },
      customer: {
        title: 'Customer-specific',
        description:
          'Choose this for a dedicated recipe, then select the actual customer in Owner Customer. Create the customer record first if it does not exist.',
      },
    },
    instruction:
      'For example, use Internal for R50’s general recipe and Customer-specific + Customer A for a recipe dedicated to Customer A. Ownership defines the recipe’s scope, not its responsible department. Check versions and weights separately for each scope.',
  },
  performanceAndWeight: {
    title: 'Performance version and weight: this product’s configuration',
    summary:
      'Select a product, open the adjacent settings button to maintain versions and weights, then choose a version from the dropdown.',
    items: {
      catalog: {
        title: 'Shared names, used as needed',
        description:
          'Standard, Lightweight, and Ultralight are shared options. Each product uses only the versions it needs; models do not need every version.',
      },
      weight: {
        title: 'Weight is saved with this BOM',
        description:
          'Enter the finished weight and unit for this specific product, performance version, and recipe, such as R50 Lightweight at 420 g. Another product’s Lightweight can differ. Material usage and estimated cost do not calculate finished weight.',
      },
      save: {
        title: 'Catalog saves and BOM saves are separate',
        description:
          'After saving version options, select a version from the dropdown and save the BOM. Only the selected version and weight are saved. Other Session draft entries are not saved together.',
      },
    },
    instruction:
      'Compare the same product, engineering or manufacturing type, ownership, and customer. Draft weight can be completed later; release requires a positive finished weight and a weight unit.',
  },
  lifecycle: {
    title: 'Why does a BOM have a lifecycle?',
    summary:
      'Recipes move through preparation, confirmation, use, and retirement. Status identifies whether this BOM can be edited or formally used; it is separate from the model and performance version.',
    items: {
      draft: {
        title: 'Draft (DRAFT)',
        description:
          'Being prepared; editable and saveable. Saving a draft does not make it ready for production.',
      },
      released: {
        title: 'Released (RELEASED)',
        description:
          'Released with locked content. A released, locked EBOM can be used to derive an MBOM.',
      },
      obsolete: {
        title: 'Obsolete (OBSOLETE)',
        description:
          'Retired with history retained. It cannot be edited directly or restored to Draft.',
      },
    },
    instruction:
      'The current lifecycle is Draft, Released, Obsolete. Effective dates do not publish automatically. Historical In Review or Approved records can be published directly, subject to permissions and validation.',
  },
}
