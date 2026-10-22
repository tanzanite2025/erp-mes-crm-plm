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
      className='min-w-0 space-y-4'
      aria-label={isZh ? '当前模板属性' : 'Attributes of this template'}
    >
      <div className='space-y-1'>
        <h3 className='text-sm font-bold text-foreground'>
          {isZh ? '模板属性与选项' : 'Template attributes and options'}
        </h3>
        <p className='text-xs leading-6 text-muted-foreground'>
          {isZh
            ? '属性和选项仅属于当前模板。使用此模板建档时，产品分别填写自己的选项；所有修改随模板一起保存。'
            : 'Attributes and options belong to this template. Each product records its own selections. All changes are saved with the template.'}
        </p>
      </div>
      {definitions.length === 0 && (
        <p className='rounded-2xl border border-dashed p-4 text-sm text-muted-foreground'>
          {isZh
            ? '尚未添加属性。可直接添加工艺系列、制动类型等当前模板需要的字段。'
            : 'No attributes yet. Add the fields this template needs.'}
        </p>
      )}
      {definitions.map((definition, attributeIndex) => {
        const attributeLabel =
          definition.nameZh ||
          `${isZh ? '属性' : 'Attribute'} ${attributeIndex + 1}`
        return (
          <article
            key={definition.categoryKey}
            className='min-w-0 space-y-3 rounded-2xl border p-4'
            aria-label={attributeLabel}
          >
            <div className='flex flex-wrap items-center gap-2'>
              <div className='grid min-w-0 flex-1 gap-2 sm:grid-cols-2'>
                <Input
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
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={attributeIndex === 0}
                  aria-label={
                    isZh ? `上移${attributeLabel}` : `Move ${attributeLabel} up`
                  }
                  onClick={() =>
                    moveTemplateOwnedAttributeDefinition(attributeIndex, -1)
                  }
                >
                  <ArrowUp className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
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
                  <ArrowDown className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={
                    isZh ? `移除${attributeLabel}` : `Remove ${attributeLabel}`
                  }
                  onClick={() =>
                    onDefinitionsChange(
                      definitions.filter((_, index) => index !== attributeIndex)
                    )
                  }
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            </div>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-4 text-xs'>
                <label className='flex items-center gap-2'>
                  <Checkbox
                    checked={definition.required}
                    onCheckedChange={(checked) =>
                      updateTemplateOwnedAttributeDefinition(attributeIndex, {
                        required: checked === true,
                      })
                    }
                  />
                  {isZh ? '必填' : 'Required'}
                </label>
                <label className='flex items-center gap-2'>
                  <Checkbox
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
              <Button
                type='button'
                variant='outline'
                size='sm'
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
            </div>
            <div className='space-y-2'>
              {definition.options.length === 0 && (
                <p className='py-1 text-xs text-muted-foreground'>
                  {isZh
                    ? '暂无选项，请添加产品可以选择的内容。'
                    : 'Add the values products can select.'}
                </p>
              )}
              {definition.options.map((option, optionIndex) => (
                <div
                  key={option.value}
                  className='flex flex-wrap items-center gap-2'
                >
                  <div className='grid min-w-0 flex-1 gap-2 sm:grid-cols-2'>
                    <Input
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
                  </div>
                  <label className='flex items-center gap-2 px-1 text-xs'>
                    <Checkbox
                      checked={option.active}
                      onCheckedChange={(checked) =>
                        updateTemplateOwnedAttributeOption(
                          attributeIndex,
                          optionIndex,
                          { active: checked === true }
                        )
                      }
                    />
                    {isZh ? '启用' : 'Enabled'}
                  </label>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    aria-label={
                      isZh
                        ? `删除${attributeLabel}选项 ${optionIndex + 1}`
                        : `Delete ${attributeLabel} option ${optionIndex + 1}`
                    }
                    onClick={() =>
                      updateTemplateOwnedAttributeDefinition(attributeIndex, {
                        options: definition.options.filter(
                          (_, index) => index !== optionIndex
                        ),
                      })
                    }
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              ))}
            </div>
          </article>
        )
      })}
      <Button
        type='button'
        variant='outline'
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
        <Plus className='size-4' />
        {isZh ? '添加属性' : 'Add attribute'}
      </Button>
      <p className='text-xs leading-6 text-muted-foreground'>
        {isZh
          ? '已有产品使用的属性或选项可停用，保留已有产品记录；未使用的内容可删除。'
          : 'Disable attributes or options already used by products to preserve their records. Unused definitions can be deleted.'}
      </p>
    </section>
  )
}
