import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

// --write performs a surgical migration of class literals. The default is a
// read-only check suitable for CI; source formatting and business code stay intact.
const shouldMigrateControlTypography = process.argv.includes('--write')
const sharedControlComponentNames = new Set([
  'Button',
  'Input',
  'Textarea',
  'SelectTrigger',
  'SelectItem',
  'CommandInput',
  'CommandItem',
  'DropdownMenuItem',
  'DropdownMenuCheckboxItem',
  'DropdownMenuRadioItem',
  'DropdownMenuSubTrigger',
  'AlertDialogAction',
  'AlertDialogCancel',
  'AuditTimelineTriggerButton',
  'TabsTrigger',
  'button',
  'input',
  'textarea',
  'select',
])
const inheritedControlLabelElementNames = new Set([
  'span',
  'div',
  'p',
  'strong',
  'small',
  'b',
  'em',
  'a',
  'Fragment',
  'React.Fragment',
  'motion.span',
  'motion.div',
])
const controlTypographyViolations = []
const changedControlTypographyFiles = []
let checkedControlElementCount = 0

function collectTypeScriptSourceFilesForControlTypography(directoryPath) {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap(
    (entry) => {
      const entryPath = join(directoryPath, entry.name)
      if (entry.isDirectory()) {
        return collectTypeScriptSourceFilesForControlTypography(entryPath)
      }
      return entry.name.endsWith('.tsx') &&
        !/\.(spec|test)\.tsx$/.test(entry.name)
        ? [entryPath]
        : []
    }
  )
}

function isIndependentControlTypographyUtility(classNameToken) {
  const utilityName = classNameToken
    .split(/:(?![^\[]*\])/)
    .at(-1)
    .replace(/^!|!$/g, '')
  return /^(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|\[(?:\d|length:|clamp\(|var\(--.*font-size))|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d)|leading-|tracking-|uppercase$|lowercase$|capitalize$|normal-case$)/.test(
    utilityName
  )
}

function findJsxAttributeByName(openingElement, attributeName, sourceFile) {
  return openingElement.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText(sourceFile) === attributeName
  )
}

function collectClassNameStringLiterals(
  expression,
  localClassDefinitions,
  visitedDefinitions = new Set()
) {
  if (!expression) return []
  if (ts.isStringLiteralLike(expression)) return [expression]
  if (
    ts.isJsxExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  ) {
    return collectClassNameStringLiterals(
      expression.expression,
      localClassDefinitions,
      visitedDefinitions
    )
  }
  if (ts.isConditionalExpression(expression)) {
    return [expression.whenTrue, expression.whenFalse].flatMap((branch) =>
      collectClassNameStringLiterals(
        branch,
        localClassDefinitions,
        visitedDefinitions
      )
    )
  }
  if (ts.isBinaryExpression(expression)) {
    return [expression.left, expression.right].flatMap((operand) =>
      collectClassNameStringLiterals(
        operand,
        localClassDefinitions,
        visitedDefinitions
      )
    )
  }
  if (
    ts.isCallExpression(expression) &&
    /^(?:cn|clsx|twMerge)$/.test(expression.expression.getText())
  ) {
    return expression.arguments.flatMap((argument) =>
      collectClassNameStringLiterals(
        argument,
        localClassDefinitions,
        visitedDefinitions
      )
    )
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap((element) =>
      collectClassNameStringLiterals(
        element,
        localClassDefinitions,
        visitedDefinitions
      )
    )
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.flatMap((property) =>
      property.name && ts.isStringLiteralLike(property.name)
        ? [property.name]
        : []
    )
  }
  if (ts.isIdentifier(expression) && !visitedDefinitions.has(expression.text)) {
    const definition = localClassDefinitions.get(expression.text)
    if (!definition) return []
    const nextVisitedDefinitions = new Set(visitedDefinitions).add(
      expression.text
    )
    return collectClassNameStringLiterals(
      definition,
      localClassDefinitions,
      nextVisitedDefinitions
    )
  }
  // Imported style objects and arbitrary function calls are deliberately not
  // rewritten. The shared CSS contract also governs those runtime class values.
  return []
}

function checkOrMigrateControlTypographyInSourceFile(sourceFilePath) {
  const originalSource = readFileSync(sourceFilePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    sourceFilePath,
    originalSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const localClassDefinitions = new Map()
  const literalReplacements = new Map()

  function collectLocalControlClassDefinitions(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      localClassDefinitions.set(node.name.text, node.initializer)
    }
    ts.forEachChild(node, collectLocalControlClassDefinitions)
  }
  collectLocalControlClassDefinitions(sourceFile)

  function checkOrMigrateClassNameAttribute(openingElement, isControlRoot) {
    const classAttribute = findJsxAttributeByName(
      openingElement,
      'className',
      sourceFile
    )
    const classLiterals = collectClassNameStringLiterals(
      classAttribute?.initializer,
      localClassDefinitions
    )
    for (const classLiteral of classLiterals) {
      const literalStart = classLiteral.getStart(sourceFile) + 1
      const existingContent =
        literalReplacements.get(literalStart)?.content ??
        originalSource.slice(literalStart, classLiteral.end - 1)
      const independentUtilities = existingContent
        .split(/\s+/)
        .filter(isIndependentControlTypographyUtility)
      if (independentUtilities.length === 0) continue
      const line =
        sourceFile.getLineAndCharacterOfPosition(
          classLiteral.getStart(sourceFile)
        ).line + 1
      controlTypographyViolations.push({
        file: sourceFilePath,
        line,
        utilities: independentUtilities,
      })
      let migratedContent = existingContent
        .replace(/\S+/g, (classToken) =>
          isIndependentControlTypographyUtility(classToken) ? '' : classToken
        )
        .replace(/ {2,}/g, ' ')
        .trim()
      // Compact controls have an explicit readable scale, independent of sm
      // buttons that pages intentionally expand to toolbar height.
      if (
        isControlRoot &&
        /(?:^|\s)(?:h|size)-(?:4|5|6|7)(?:\.5)?(?:\s|$)/.test(
          existingContent
        ) &&
        !existingContent.includes('control-typography-compact')
      ) {
        migratedContent = `control-typography-compact ${migratedContent}`
      }
      literalReplacements.set(literalStart, {
        end: classLiteral.end - 1,
        content: migratedContent,
      })
    }
  }

  function visitControlElementsAndTheirTextLabels(
    node,
    inheritsControlTypography = false
  ) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const openingElement = ts.isJsxElement(node) ? node.openingElement : node
      const elementName = openingElement.tagName.getText(sourceFile)
      const isControlRoot = sharedControlComponentNames.has(elementName)
      const hasSemanticContentSlot = !!findJsxAttributeByName(
        openingElement,
        'data-slot',
        sourceFile
      )
      const isInheritedLabel =
        inheritsControlTypography &&
        inheritedControlLabelElementNames.has(elementName) &&
        !hasSemanticContentSlot
      if (isControlRoot) checkedControlElementCount++
      if (isControlRoot || isInheritedLabel) {
        checkOrMigrateClassNameAttribute(openingElement, isControlRoot)
      }
      if (ts.isJsxElement(node)) {
        // Clickable cards can keep headings and summary values. Their ordinary
        // text labels inherit; named slots and component boundaries keep their
        // explicit content hierarchy.
        const inheritsThroughCurrentElement = isControlRoot || isInheritedLabel
        node.children.forEach((child) =>
          visitControlElementsAndTheirTextLabels(
            child,
            inheritsThroughCurrentElement
          )
        )
      }
      return
    }
    ts.forEachChild(node, (child) =>
      visitControlElementsAndTheirTextLabels(child, inheritsControlTypography)
    )
  }
  visitControlElementsAndTheirTextLabels(sourceFile)

  if (shouldMigrateControlTypography && literalReplacements.size > 0) {
    let migratedSource = originalSource
    for (const [start, replacement] of [...literalReplacements].sort(
      (left, right) => right[0] - left[0]
    )) {
      migratedSource =
        migratedSource.slice(0, start) +
        replacement.content +
        migratedSource.slice(replacement.end)
    }
    if (migratedSource !== originalSource) {
      writeFileSync(sourceFilePath, migratedSource)
      changedControlTypographyFiles.push(sourceFilePath)
    }
  }
}

for (const sourceFilePath of collectTypeScriptSourceFilesForControlTypography(
  join(process.cwd(), 'src')
)) {
  checkOrMigrateControlTypographyInSourceFile(sourceFilePath)
}

if (shouldMigrateControlTypography) {
  console.log(
    JSON.stringify(
      {
        checkedControlElementCount,
        migratedFiles: changedControlTypographyFiles.length,
        removedTypographyDeclarations: controlTypographyViolations.reduce(
          (count, violation) => count + violation.utilities.length,
          0
        ),
        files: changedControlTypographyFiles.map((file) =>
          relative(process.cwd(), file)
        ),
      },
      null,
      2
    )
  )
} else if (controlTypographyViolations.length > 0) {
  for (const violation of controlTypographyViolations) {
    console.error(
      `${relative(process.cwd(), violation.file)}:${violation.line}: use shared control typography instead of ${violation.utilities.join(' ')}`
    )
  }
  process.exitCode = 1
} else {
  console.log(
    `[control-typography] OK: ${checkedControlElementCount} controls and their labels use the shared typography contract.`
  )
}
