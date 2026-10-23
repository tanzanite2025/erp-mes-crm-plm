import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  type ProductTemplateAttributeBinding,
  type ProductTemplateOwnedAttributeOptionDefinition,
} from '../../data/schema'
import {
  generateProductAttributeCategoryMachineKey,
  generateProductAttributeOptionMachineValue,
} from '../../utils/product-attribute-machine-value'
import { ProductPhysicalSpecificationTemplateDeleteConfirmationDialog } from './product-physical-specification-template-delete-confirmation-dialog'
import { productPhysicalSpecificationTemplateAttributeEditorStyles as editorStyles } from './product-physical-specification-template-editor-dialog-and-attribute-layout.styles'

interface ProductTemplateOwnedAttributeDefinitionsEditorProps {
  locale: string
  definitions: ProductTemplateAttributeBinding[]
  onDefinitionsChange: (definitions: ProductTemplateAttributeBinding[]) => void
}

export function ProductTemplateOwnedAttributeDefinitionsEditor({
  locale,
  definitions,
  onDefinitionsChange,
}: ProductTemplateOwnedAttributeDefinitionsEditorProps) {
  const isZh = locale.startsWith('zh')
  const [pendingDefinitionDeletion, setPendingDefinitionDeletion] = useState<{
    categoryKey: string
    optionValue?: string
    name: string
  } | null>(null)

  function confirmTemplateOwnedAttributeOrOptionDeletion() {
    if (!pendingDefinitionDeletion) return
    const { categoryKey, optionValue } = pendingDefinitionDeletion
    onDefinitionsChange(
      optionValue === undefined
        ? definitions.filter(
            (definition) => definition.categoryKey !== categoryKey
          )
        : definitions.map((definition) =>
            definition.categoryKey === categoryKey
              ? {
                  ...definition,
                  options: definition.options.filter(
                    (option) => option.value !== optionValue
                  ),
                }
              : definition
          )
    )
    setPendingDefinitionDeletion(null)
  }

  function updateTemplateOwnedAttributeDefinition(
    index: number,
    changes: Partial<ProductTemplateAttributeBinding>
  ) {
    onDefinitionsChange(
      definitions.map((definition, itemIndex) =>
        itemIndex === index ? { ...definition, ...changes } : definition
      )
    )
  }

  function updateTemplateOwnedAttributeOption(
    attributeIndex: number,
    optionIndex: number,
    changes: Partial<ProductTemplateOwnedAttributeOptionDefinition>
  ) {
    updateTemplateOwnedAttributeDefinition(attributeIndex, {
      options: definitions[attributeIndex].options.map((option, itemIndex) =>
        itemIndex === optionIndex ? { ...option, ...changes } : option
      ),
    })
  }

  function moveTemplateOwnedAttributeDefinition(
    index: number,
    direction: number
  ) {
    const nextDefinitions = [...definitions]
    const destination = index + direction
    if (destination < 0 || destination >= nextDefinitions.length) return
    const movedDefinition = nextDefinitions[index]
    nextDefinitions[index] = nextDefinitions[destination]
    nextDefinitions[destination] = movedDefinition
    onDefinitionsChange(nextDefinitions)
  }

  return (
    <section
      className={editorStyles.section}
      aria-label={isZh ? '当前模板属性' : 'Attributes of this template'}
    >
      <div className={editorStyles.heading}>
        <div className='min-w-0'>
          <h3 className='text-sm font-black text-foreground'>
            {isZh ? '规格属性与选项' : 'Specification attributes and options'}
          </h3>
          <p className={editorStyles.description}>
            {isZh
              ? '在当前模板内直接维护，各模板独立保存。'
              : 'Edit definitions directly. Each template is maintained independently.'}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          className={editorStyles.addAttributeButton}
          onClick={() =>
            onDefinitionsChange([
              ...definitions,
              {
                categoryKey: generateProductAttributeCategoryMachineKey(),
                nameZh: '',
                nameEn: '',
                description: '',
                options: [],
                sortOrder: definitions.length + 1,
                required: false,
                active: true,
                version: 1,
              },
            ])
          }
        >
          <Plus className='size-3.5' />
          {isZh ? '添加属性' : 'Add attribute'}
        </Button>
      </div>
      {definitions.length === 0 && (
        <p className='rounded-2xl border border-dashed p-4 text-sm text-muted-foreground'>
          {isZh
            ? '尚未添加属性。可直接添加工艺系列、制动类型等当前模板需要的字段。'
            : 'No attributes yet. Add the fields this template needs.'}
        </p>
      )}
      <div className={editorStyles.grid}>
        {definitions.map((definition, attributeIndex) => {
          const attributeLabel =
            definition.nameZh ||
            `${isZh ? '属性' : 'Attribute'} ${attributeIndex + 1}`
          return (
            <article
              key={definition.categoryKey}
              className={editorStyles.card}
              aria-label={attributeLabel}
            >
              <div className={editorStyles.cardToolbar}>
                <span
                  className={editorStyles.attributeNumber}
                  aria-hidden='true'
                >
                  {String(attributeIndex + 1).padStart(2, '0')}
                </span>
                <div className='flex items-center gap-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className={editorStyles.iconButton}
                    disabled={attributeIndex === 0}
                    aria-label={
                      isZh
                        ? `上移${attributeLabel}`
                        : `Move ${attributeLabel} up`
                    }
                    onClick={() =>
                      moveTemplateOwnedAttributeDefinition(attributeIndex, -1)
                    }
                  >
                    <ArrowUp className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className={editorStyles.iconButton}
                    disabled={attributeIndex === definitions.length - 1}
                    aria-label={
                      isZh
                        ? `下移${attributeLabel}`
                        : `Move ${attributeLabel} down`
                    }
                    onClick={() =>
                      moveTemplateOwnedAttributeDefinition(attributeIndex, 1)
                    }
                  >
                    <ArrowDown className='size-3.5' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className={editorStyles.deleteButton}
                    aria-label={
                      isZh
                        ? `移除${attributeLabel}`
                        : `Remove ${attributeLabel}`
                    }
                    onClick={() =>
                      setPendingDefinitionDeletion({
                        categoryKey: definition.categoryKey,
                        name: attributeLabel,
                      })
                    }
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              </div>
              <div className={editorStyles.attributeNames}>
                <Input
                  className={editorStyles.input}
                  aria-label={
                    isZh
                      ? `属性 ${attributeIndex + 1} 名称`
                      : `Attribute ${attributeIndex + 1} name`
                  }
                  placeholder={isZh ? '属性名称，如工艺系列' : 'Attribute name'}
                  value={definition.nameZh}
                  required
                  maxLength={255}
                  onChange={(event) =>
                    updateTemplateOwnedAttributeDefinition(attributeIndex, {
                      nameZh: event.target.value,
                    })
                  }
                />
                <Input
                  className={editorStyles.input}
                  aria-label={
                    isZh
                      ? `${attributeLabel}英文名称`
                      : `${attributeLabel} English name`
                  }
                  placeholder={
                    isZh ? '英文名称（选填）' : 'English name (optional)'
                  }
                  value={definition.nameEn ?? ''}
                  maxLength={255}
                  onChange={(event) =>
                    updateTemplateOwnedAttributeDefinition(attributeIndex, {
                      nameEn: event.target.value,
                    })
                  }
                />
              </div>
              <div className={editorStyles.flags}>
                <label className={editorStyles.flagLabel}>
                  <Checkbox
                    className={editorStyles.checkbox}
                    checked={definition.required}
                    onCheckedChange={(checked) =>
                      updateTemplateOwnedAttributeDefinition(attributeIndex, {
                        required: checked === true,
                      })
                    }
                  />
                  {isZh ? '必填' : 'Required'}
                </label>
                <label className={editorStyles.flagLabel}>
                  <Checkbox
                    className={editorStyles.checkbox}
                    checked={definition.active}
                    onCheckedChange={(checked) =>
                      updateTemplateOwnedAttributeDefinition(attributeIndex, {
                        active: checked === true,
                      })
                    }
                  />
                  {isZh ? '启用属性' : 'Attribute enabled'}
                </label>
              </div>
              <div className='space-y-2'>
                {definition.options.length > 0 && (
                  <div
                    className={`${editorStyles.optionRow} text-[10px] font-semibold text-muted-foreground`}
                    aria-hidden='true'
                  >
                    <span>{isZh ? '选项名称' : 'Option name'}</span>
                    <span>
                      {isZh ? '英文名称（选填）' : 'English (optional)'}
                    </span>
                    <span className='text-center'>{isZh ? '启用' : 'On'}</span>
                  </div>
                )}
                {definition.options.length === 0 && (
                  <p className='py-1 text-xs text-muted-foreground'>
                    {isZh
                      ? '暂无选项，请添加产品可以选择的内容。'
                      : 'Add the values products can select.'}
                  </p>
                )}
                {definition.options.map((option, optionIndex) => (
                  <div key={option.value} className={editorStyles.optionRow}>
                    <Input
                      className={editorStyles.input}
                      aria-label={
                        isZh
                          ? `${attributeLabel}选项 ${optionIndex + 1}`
                          : `${attributeLabel} option ${optionIndex + 1}`
                      }
                      placeholder={
                        isZh ? '选项名称，如常规系列' : 'Option name'
                      }
                      value={option.labelZh}
                      required
                      maxLength={255}
                      onChange={(event) =>
                        updateTemplateOwnedAttributeOption(
                          attributeIndex,
                          optionIndex,
                          { labelZh: event.target.value }
                        )
                      }
                    />
                    <Input
                      className={editorStyles.input}
                      aria-label={
                        isZh
                          ? `${attributeLabel}选项 ${optionIndex + 1} 英文名称`
                          : `${attributeLabel} option ${optionIndex + 1} English name`
                      }
                      placeholder={
                        isZh ? '英文名称（选填）' : 'English name (optional)'
                      }
                      value={option.labelEn ?? ''}
                      maxLength={255}
                      onChange={(event) =>
                        updateTemplateOwnedAttributeOption(
                          attributeIndex,
                          optionIndex,
                          { labelEn: event.target.value }
                        )
                      }
                    />
                    <label className='flex h-9 items-center justify-center'>
                      <Checkbox
                        className={editorStyles.checkbox}
                        checked={option.active}
                        onCheckedChange={(checked) =>
                          updateTemplateOwnedAttributeOption(
                            attributeIndex,
                            optionIndex,
                            { active: checked === true }
                          )
                        }
                      />
                      <span className='sr-only'>
                        {isZh ? '启用' : 'Enabled'}
                      </span>
                    </label>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={editorStyles.deleteButton}
                      aria-label={
                        isZh
                          ? `删除${attributeLabel}选项 ${optionIndex + 1}`
                          : `Delete ${attributeLabel} option ${optionIndex + 1}`
                      }
                      onClick={() =>
                        setPendingDefinitionDeletion({
                          categoryKey: definition.categoryKey,
                          optionValue: option.value,
                          name: `${attributeLabel} / ${option.labelZh || option.labelEn || (isZh ? `选项 ${optionIndex + 1}` : `Option ${optionIndex + 1}`)}`,
                        })
                      }
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className={editorStyles.addOptionButton}
                onClick={() =>
                  updateTemplateOwnedAttributeDefinition(attributeIndex, {
                    options: [
                      ...definition.options,
                      {
                        value: generateProductAttributeOptionMachineValue(),
                        labelZh: '',
                        labelEn: '',
                        description: '',
                        sortOrder: definition.options.length + 1,
                        active: true,
                      },
                    ],
                  })
                }
              >
                <Plus className='size-3.5' />
                {isZh ? '添加选项' : 'Add option'}
              </Button>
            </article>
          )
        })}
      </div>
      <p className='text-[11px] leading-relaxed text-muted-foreground'>
        {isZh
          ? '已有产品使用的属性或选项可停用，保留已有产品记录；未使用的内容可删除。'
          : 'Disable attributes or options already used by products to preserve their records. Unused definitions can be deleted.'}
      </p>
      {pendingDefinitionDeletion && (
        <ProductPhysicalSpecificationTemplateDeleteConfirmationDialog
          locale={locale}
          targetName={pendingDefinitionDeletion.name}
          targetKind={
            pendingDefinitionDeletion.optionValue === undefined
              ? 'attribute'
              : 'option'
          }
          onOpenChange={(open) => {
            if (!open) setPendingDefinitionDeletion(null)
          }}
          onConfirm={confirmTemplateOwnedAttributeOrOptionDeletion}
        />
      )}
    </section>
  )
}
