export const productAndBOMFieldResponsibilityGuidance = {
  title: 'What do you need to enter? Choose the right record',
  description:
    'Products define model identity, physical specifications and appearance. A BOM defines the recipe, performance configuration and usage stage for a specific product.',
  product: {
    title: 'Product · Model, specifications and appearance',
    summary:
      'Base model, specific product, physical dimensions, finish and appearance',
    description:
      'For a rim, enter depth, inner and outer width, hole count, brake type, finish and texture using the physical specification template assigned to the product.',
    example:
      'Example: R50 base model / 50 mm depth / 25 mm inner width / UD appearance.',
    entry: 'Enter product model, specifications and finish',
    notice:
      'Enter model, physical specifications and finish here. Maintain ownership, performance version, finished weight and material recipe in the BOM.',
  },
  bom: {
    title: 'BOM · Ownership, versions, weight and recipe',
    summary:
      'Specific product + ownership + performance version + finished weight + material recipe',
    description:
      'Ownership means internal production or supply to a specific customer. Performance versions distinguish configurations such as standard and lightweight. Finished weight and unit belong to this BOM, along with materials, usage, wastage and the engineering or manufacturing lifecycle.',
    example:
      'Example: the same specific product / internal production / lightweight / 420 g / the corresponding carbon, resin and usage.',
    entry: 'Enter BOM ownership, versions, weight and recipe',
    notice:
      'Maintain the selected product’s ownership, performance version, finished weight and material recipe here. Model, physical dimensions and finish belong to the product record.',
  },
  weightRule:
    'Enter finished weight and unit, performance version, ownership and material recipe in the BOM. Avoid duplicate fields in product specifications or templates so there is only one set of values.',
  saveProductFirst:
    'Save the specific product first, then create the BOMs it needs. Different performance versions of the same product can have their own weight and recipe.',
  templateNotice:
    'This template defines product physical specifications and appearance. Finished weight and unit, performance version, ownership and material recipe belong to the BOM; avoid creating duplicate attributes here.',
  productAccessRequired:
    'Your account cannot access Product Management. You can continue reading the explanation.',
}
