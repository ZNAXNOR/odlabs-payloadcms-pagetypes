'use client'

import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { QuickCreateButton } from '../../exports/client'
import styles from './PageTypesHealth.module.css'

interface PageTypeConfig {
  slug: string
  label: string
  required?: boolean
}

interface PageTypesHealthClientProps {
  pageTypes: PageTypeConfig[]
  collectionSlug: string
  rootsByTypeSize: number
  missing: PageTypeConfig[]
  duplicates: [string, any[]][]
  isHealthy: boolean
  healthPct: number
  error: string | null
}

export function PageTypesHealthClient({
  pageTypes,
  collectionSlug,
  rootsByTypeSize,
  missing,
  duplicates,
  isHealthy,
  healthPct,
  error,
}: PageTypesHealthClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Page Types Health</h3>
        <span
          className={`${styles.badge} ${
            isHealthy ? styles.badgeHealthy : styles.badgeError
          }`}
        >
          {isHealthy ? 'Healthy' : 'Action Required'}
        </span>
      </div>

      <div className={styles.content}>
        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <div className={styles.alertTitle}>
              <AlertCircle className={styles.alertIcon} />
              Error
            </div>
            <div>{error}</div>
          </div>
        )}

        {missing.length > 0 && (
          <div className={`${styles.alert} ${styles.alertError}`} style={{ marginBottom: '1rem' }}>
            <div className={styles.alertTitle}>
              <AlertCircle className={styles.alertIcon} />
              Missing root pages
            </div>
            <ul className={styles.list}>
              {missing.map((pt) => (
                <li key={pt.slug} className={styles.listItem}>
                  <span className={styles.label}>
                    {pt.label}
                    {pt.required && (
                      <span className={styles.required}>(required)</span>
                    )}
                  </span>
                  <QuickCreateButton
                    collectionSlug={collectionSlug}
                    label={pt.label}
                    pageType={pt.slug}
                    slug={pt.slug}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className={`${styles.alert} ${styles.alertWarning}`} style={{ marginBottom: '1rem' }}>
            <div className={styles.alertTitle}>
              <AlertTriangle className={styles.alertIcon} />
              Duplicate root pages
            </div>
            <div className={styles.list}>
              {duplicates.map(([type, pages]) => (
                <div key={type}>
                  <strong className={styles.label}>
                    {pageTypes.find((pt) => pt.slug === type)?.label ?? type}
                  </strong>
                  <ul style={{ marginTop: '0.25rem', marginLeft: '1rem', listStyle: 'disc' }}>
                    {pages.map((p: any) => (
                      <li key={String(p.id)} style={{ fontSize: '0.875rem' }}>
                        {String(p.title || 'Untitled')} ({String(p.slug || 'no-slug')})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {isHealthy && !error && (
          <div className={styles.success} style={{ marginBottom: '1rem' }}>
            <CheckCircle2 className={styles.alertIcon} />
            <p>All page types have valid root pages.</p>
          </div>
        )}

        <div className={styles.stats} style={{ marginBottom: '1rem' }}>
          <div>
            <p className={styles.statLabel}>Types</p>
            <p className={styles.statValue}>{pageTypes.length}</p>
          </div>
          <div>
            <p className={styles.statLabel}>Roots Found</p>
            <p className={styles.statValue}>{rootsByTypeSize}</p>
          </div>
          <div>
            <p className={styles.statLabel}>Health</p>
            <p className={styles.statValue}>{healthPct}%</p>
          </div>
        </div>

        <button 
          className={styles.viewDetails} 
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          View Details
        </button>
      </div>

      {/* Modal */}
      <div className={`${styles.modalOverlay} ${isModalOpen ? styles.open : ''}`}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Page Types Details</h3>
            <button 
              className={styles.closeButton} 
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              <X className={styles.alertIcon} />
            </button>
          </div>
          <div className={styles.modalBody}>
            {pageTypes.map(pt => {
              const isMissing = missing.some(m => m.slug === pt.slug)
              const isDuplicate = duplicates.some(([slug]) => slug === pt.slug)
              
              let statusIcon = <CheckCircle2 className={styles.alertIcon} style={{ color: 'rgb(5, 150, 105)' }} />
              let statusText = 'Healthy'
              
              if (isMissing) {
                statusIcon = <AlertCircle className={styles.alertIcon} style={{ color: 'rgb(220, 38, 38)' }} />
                statusText = 'Missing root'
              } else if (isDuplicate) {
                statusIcon = <AlertTriangle className={styles.alertIcon} style={{ color: 'rgb(217, 119, 6)' }} />
                statusText = 'Duplicate roots'
              }

              return (
                <div key={pt.slug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--theme-elevation-50)', borderRadius: '0.375rem', border: '1px solid var(--theme-elevation-150)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {statusIcon}
                    <div>
                      <div style={{ fontWeight: 500 }}>{pt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-500)' }}>/{pt.slug}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {statusText}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
