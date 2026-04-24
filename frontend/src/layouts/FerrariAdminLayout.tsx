import { useEffect, useState } from 'react'
import { Link, Outlet, useOutletContext } from 'react-router-dom'
import styles from './FerrariAdminLayout.module.css'

export default function FerrariAdminLayout() {
  const [title, setTitle] = useState('Observability')

  return (
    <div data-theme="ferrari-obs" className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.wordmark}>OBSERVATORY</div>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.actions}>
          <Link to="/admin/queue" className={styles.backLink}>BACK TO ADMIN</Link>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet context={{ setTitle }} />
      </main>
    </div>
  )
}

export function useFerrariTitle(title: string) {
  const { setTitle } = useOutletContext<{ setTitle: (title: string) => void }>()

  useEffect(() => {
    setTitle(title)
  }, [title, setTitle])
}
