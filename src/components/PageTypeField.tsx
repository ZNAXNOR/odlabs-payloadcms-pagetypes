'use client'

import { FieldLabel, SelectInput, useConfig, useDocumentInfo, useField, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

export const PageTypeField: React.FC<any> = (props) => {
  const { label: labelFromProps, path, validate } = props
  const label = labelFromProps || props.field?.label || 'Page Type'
  
  useEffect(() => {
    console.log('PageTypeField props:', { label, path, value: props.value })
  }, [label, path, props.value])

  const staticOptions = props.options || props.field?.options || []
  const { errorMessage, setValue, showError, value } = useField<string>({ path, validate })
  const { id } = useDocumentInfo()
  const { config } = useConfig()

  // Watch the parent field
  const parentId = useFormFields(([fields]) => fields.parent?.value) as null | number | string
  // Track if we were previously a child to handle clearing on parent removal
  const [wasChild, setWasChild] = useState(!!parentId)

  const [usedTypes, setUsedTypes] = useState<Set<string>>(new Set())
  const [, setIsLoading] = useState(true)

  // 1. Fetch used types and handle inheritance
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const serverURL = config.serverURL || ''
        const apiPath = config.routes.api || '/api'
        const baseUrl = `${serverURL}${apiPath}/pages`

        // Fetch used types for root pages
        const usedTypesRes = await fetch(
          `${baseUrl}?where[parent][equals]=null&depth=0&limit=100`,
        )
        const usedTypesData = await usedTypesRes.json()

        if (isMounted && usedTypesData && Array.isArray(usedTypesData.docs)) {
          const types = new Set<string>()
          usedTypesData.docs.forEach((doc: any) => {
            if (doc.id !== id) {
              types.add(doc.pageType)
            }
          })
          setUsedTypes(types)
        }

        // Handle inheritance if parent is selected
        if (parentId) {
          const parentRes = await fetch(`${baseUrl}/${parentId}?depth=0`)
          const parentDoc = await parentRes.json()

          if (isMounted && parentDoc?.pageType) {
            setValue(parentDoc.pageType)
            setWasChild(true)
          }
        } else if (wasChild) {
          // If we transitioned from child to root, clear the inherited type
          setValue(null as any)
          setWasChild(false)
        }
      } catch (err) {
        console.error('Failed to fetch page type data:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData().catch((err) => console.error('Unhandled error in fetchData:', err))

    return () => {
      isMounted = false
    }
  }, [parentId, id, config, setValue, wasChild])

  // 2. Filter options based on used types
  const filteredOptions = Array.isArray(staticOptions)
    ? staticOptions.filter((opt: any) => {
        // Always allow the current value
        if (opt.value === value) {
          return true
        }
        // Hide if already used by another root
        return !usedTypes.has(opt.value)
      })
    : []

  const isReadOnly = !!parentId

  return (
    <div className="field-type select" style={{ marginBottom: '1.5rem' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <FieldLabel
          label={label}
          path={path}
          required={props.field?.required}
        />
      </div>
      <div style={{ position: 'relative' }}>
        <SelectInput
          description={
            isReadOnly
              ? `Inherited from parent root.`
              : usedTypes.size > 0
              ? 'Some types are hidden because they are already used as root pages.'
              : props.admin?.description
          }
          label={undefined}
          name={path}
          onChange={(val: any) => {
            if (val) {
              setValue(val.value || val)
            } else {
              setValue(null as any)
            }
          }}
          options={filteredOptions}
          path={path}
          readOnly={isReadOnly}
          showError={showError}
          style={{
            opacity: isReadOnly ? 0.6 : 1,
            cursor: isReadOnly ? 'not-allowed' : 'auto',
          }}
          value={value}
        />
      </div>
      {showError && errorMessage && (
        <div style={{ color: 'var(--theme-error-500)', fontSize: '0.8rem', marginTop: '4px' }}>
          {errorMessage}
        </div>
      )}
    </div>
  )
}

export default PageTypeField
