import styles from './observability.module.css'

export default function CardImage({ src }: { src: string | null }) {
  if (!src) return null

  return (
    <div className={styles.finalVideo}>
      <span className={styles.bodyLabel}>GENERATED CARD IMAGE</span>
      <img className={styles.finalVideoPlayer} src={src} alt="Generated card image" />
    </div>
  )
}
