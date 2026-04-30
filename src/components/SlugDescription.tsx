'use client'
import React from 'react'
import { useFormFields, useDocumentInfo } from '@payloadcms/ui'
import { AlertCircle } from 'lucide-react'

export const SlugDescription: React.FC<any> = (props) => {
  const { path } = props
  const fields = useFormFields(([fields]) => fields)

  const slugValue = fields.slug?.value as string
  const pageTypeValue = fields.pageType?.value as string
  const parentValue = fields.parent?.value

  React.useEffect(() => {
    console.log('SlugDescription trace:', { slugValue, pageTypeValue, parentValue })
  }, [slugValue, pageTypeValue, parentValue])

  const isRoot = !parentValue
  const mismatch = isRoot && pageTypeValue && slugValue && slugValue !== pageTypeValue

  if (!mismatch) {
    return null
  }

  return (
    <div style={{ marginTop: '-10px', marginBottom: '10px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--theme-warning-500)',
        padding: '10px',
        backgroundColor: 'rgba(255, 165, 0, 0.05)',
        borderRadius: '6px',
        border: '1px solid var(--theme-warning-500)',
        fontSize: '0.85rem',
        lineHeight: '1.4'
      }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Slug Mismatch:</strong> This root page should ideally use <code>"{pageTypeValue}"</code> as its slug.
        </span>
      </div>
    </div>
  )
}

export default SlugDescription
