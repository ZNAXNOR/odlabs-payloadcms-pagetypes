'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import styles from './PageTypesHealth.module.css'

interface QuickCreateButtonProps {
  collectionSlug: string
  label: string
  pageType: string
  slug: string
}

export const QuickCreateButton: React.FC<QuickCreateButtonProps> = ({
  collectionSlug,
  label,
  pageType,
  slug,
}) => {
  const router = useRouter()

  const handleClick = () => {
    // Navigate to create page with prefilled values
    const params = new URLSearchParams({
      title: label,
      slug: slug,
      pageType: pageType,
    })
    router.push(`/admin/collections/${collectionSlug}/create?${params.toString()}`)
  }

  return (
    <button
      onClick={handleClick}
      className={styles.quickCreateBtn}
      type="button"
    >
      <Plus className={styles.quickCreateBtnIcon} />
      Quick Create
    </button>
  )
}
