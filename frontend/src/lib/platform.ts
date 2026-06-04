import { Capacitor } from '@capacitor/core'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function isIOSNativeApp(): boolean {
  return Capacitor.getPlatform() === 'ios'
}
