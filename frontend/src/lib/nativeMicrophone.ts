import { isIOSNativeApp } from '@/lib/platform'

let nativeMicrophonePermissionPromise: Promise<void> | null = null

export async function ensureNativeMicrophonePermission(): Promise<void> {
  if (!isIOSNativeApp()) return
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return

  if (!nativeMicrophonePermissionPromise) {
    nativeMicrophonePermissionPromise = navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop())
      })
      .catch((err: unknown) => {
        nativeMicrophonePermissionPromise = null
        throw err
      })
  }

  await nativeMicrophonePermissionPromise
}
