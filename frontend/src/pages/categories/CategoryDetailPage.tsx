import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import {
  getCurriculumCategoryBySlug,
  getLevelDescription,
  getLevelTitle,
} from '@/data/curriculumCategories'
import styles from './Categories.module.css'

export default function CategoryDetailPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>()
  const { t, tp } = useTranslation()
  const category = getCurriculumCategoryBySlug(categorySlug)

  if (!category) {
    return (
      <section className={styles.page}>
        <div className={styles.notFound}>
          <h1 className={styles.title}>{t('categories.notFound.title')}</h1>
          <p className={styles.subtitle}>{t('categories.notFound.body')}</p>
          <Link to="/categories" className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('categories.backToCategories')}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <Link to="/categories" className={styles.backLink}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('categories.backToCategories')}
      </Link>

      <header className={styles.detailHero}>
        <div className={styles.detailEmoji} aria-hidden="true">{category.icon}</div>
        <div>
          <p className={styles.eyebrow}>{tp('categories.levelCount', category.levelCount)}</p>
          <h1 className={styles.title}>{category.title}</h1>
          <p className={styles.subtitle}>{category.description}</p>
        </div>
      </header>

      <div className={styles.levelList}>
        {category.levels.map((level) => {
          const description = getLevelDescription(level)
          return (
            <Link
              key={level.level}
              to={`/categories/${category.slug}/${level.level}`}
              className={styles.levelRow}
            >
              <span className={styles.levelBadge}>{level.level}</span>
              <div>
                <h2 className={styles.rowTitle}>{getLevelTitle(level)}</h2>
                {description && <p className={styles.rowDescription}>{description}</p>}
                <span className={styles.rowMeta}>{tp('categories.entryCount', level.entries.length)}</span>
              </div>
              <span className={styles.rowAction}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
