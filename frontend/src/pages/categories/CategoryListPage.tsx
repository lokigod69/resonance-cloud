import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { listCurriculumCategories, type CurriculumCategory } from '@/data/curriculumCategories'
import styles from './Categories.module.css'

function CategoryHero({ category }: { category: CurriculumCategory }) {
  const [imageFailed, setImageFailed] = useState(false)
  const heroSrc = `/curriculum/categories/en/${category.slug}/hero.webp`

  if (imageFailed) {
    return (
      <div className={styles.heroPlaceholder}>
        <span className={styles.heroEmoji} aria-hidden="true">{category.icon}</span>
      </div>
    )
  }

  return (
    <img
      src={heroSrc}
      alt=""
      loading="lazy"
      className={styles.heroImage}
      onError={() => setImageFailed(true)}
    />
  )
}

export default function CategoryListPage() {
  const { t, tp } = useTranslation()
  const categories = listCurriculumCategories()

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t('categories.eyebrow')}</p>
          <h1 className={styles.title}>{t('categories.title')}</h1>
          <p className={styles.subtitle}>{t('categories.subtitle')}</p>
        </div>
      </header>

      <div className={styles.grid}>
        {categories.map((category) => (
          <Link
            key={category.slug}
            to={`/categories/${category.slug}`}
            className={styles.tile}
            aria-label={t('categories.openCategory', { title: category.title })}
          >
            <div className={styles.hero}>
              <CategoryHero category={category} />
            </div>
            <div className={styles.tileBody}>
              <h2 className={styles.tileTitle}>
                <span className={styles.tileEmoji} aria-hidden="true">{category.icon}</span>
                <span>{category.title}</span>
              </h2>
              <div className={styles.tileMeta}>
                <span className={styles.chip}>{tp('categories.levelCount', category.levelCount)}</span>
                <span className={styles.chip}>{tp('categories.entryCount', category.totalEntries)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
