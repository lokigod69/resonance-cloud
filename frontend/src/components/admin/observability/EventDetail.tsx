import type { PipelineEvent } from '@/lib/observability'
import PromptPanel from './PromptPanel'
import styles from './observability.module.css'

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export default function EventDetail({
  event,
  surface = 'dark',
}: {
  event: PipelineEvent
  surface?: 'dark' | 'light'
}) {
  const metadata = JSON.stringify(event.metadata ?? {}, null, 2)

  return (
    <div className={`${styles.detail} ${surface === 'light' ? styles.detailLight : ''}`}>
      {hasText(event.system_prompt) && (
        <PromptPanel title="System prompt" value={event.system_prompt} surface={surface} />
      )}
      {hasText(event.user_prompt) && (
        <PromptPanel title="User prompt" value={event.user_prompt} surface={surface} />
      )}
      {hasText(event.response_body) ? (
        <PromptPanel title="Response body" value={event.response_body} surface={surface} />
      ) : hasText(event.response_ref) ? (
        <section className={`${styles.promptPanel} ${surface === 'light' ? styles.promptPanelLight : ''}`}>
          <div className={styles.promptHeader}>Response body</div>
          <p className={styles.offloaded}>RESPONSE OFFLOADED · {event.response_ref}</p>
        </section>
      ) : null}
      {metadata !== '{}' && (
        <PromptPanel title="Metadata" value={metadata} surface={surface} />
      )}
      {event.status === 'failed' && (
        <div className={`${styles.eventError} ${surface === 'light' ? styles.eventErrorLight : ''}`}>
          {event.error_type ?? 'Unknown error'}
          {event.error_message ? `\n${event.error_message}` : ''}
        </div>
      )}
    </div>
  )
}
