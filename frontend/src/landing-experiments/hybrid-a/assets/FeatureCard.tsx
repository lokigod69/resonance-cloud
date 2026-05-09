type FeatureCardProps = {
  index: number
  title: string
  body: string
}

export function FeatureCard({ index, title, body }: FeatureCardProps) {
  return (
    <article className="hybrid-a-feature-card">
      <div className="hybrid-a-feature-index">{String(index).padStart(2, '0')}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}
