import { useState } from 'react'
import styles from './observability.module.css'

export default function PromptPanel({
  title,
  value,
  surface = 'dark',
  copyable = true,
}: {
  title: string
  value: string
  surface?: 'dark' | 'light'
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <section className={`${styles.promptPanel} ${surface === 'light' ? styles.promptPanelLight : ''}`}>
      <div className={styles.promptHeader}>
        <span>{title}</span>
        {copyable && (
          <button type="button" className={styles.copyButton} onClick={handleCopy}>
            {copied ? 'COPIED' : 'COPY'}
          </button>
        )}
      </div>
      <pre className={styles.promptPre}>{value}</pre>
    </section>
  )
}
