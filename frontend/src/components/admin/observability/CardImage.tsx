import styles from './observability.module.css'
import { getCardFullUrl } from '@/lib/imageUrls'

export default function CardImage({ src }: { src: string | null }) {
  if (!src) return null

  return (
    <div className={styles.finalVideo}>
      <span className={styles.bodyLabel}>GENERATED CARD IMAGE</span>
      <img
        src={getCardFullUrl(src) ?? undefined}
        alt="Generated card image"
        style={{
          display: 'block',
          width: 'auto',
          height: 'auto',
          maxWidth: '100%',
          maxHeight: '68vh',
          margin: '0 auto',
          background: 'var(--f-color-black)',
        }}
      />
    </div>
  )
}
