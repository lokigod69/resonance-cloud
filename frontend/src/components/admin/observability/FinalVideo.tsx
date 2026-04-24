import styles from './observability.module.css'

export default function FinalVideo({ src }: { src: string | null }) {
  if (!src) return null

  return (
    <div className={styles.finalVideo}>
      <span className={styles.bodyLabel}>FINAL VIDEO</span>
      <video className={styles.finalVideoPlayer} src={src} controls preload="metadata" />
    </div>
  )
}
