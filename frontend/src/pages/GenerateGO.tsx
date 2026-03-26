import GenerateWizard from '@/components/generate/GenerateWizard'

export default function GenerateGO() {
  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '80px 20px 40px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <GenerateWizard />
      </div>
    </div>
  )
}
