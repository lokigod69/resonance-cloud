/** Run local cleanup even when the auth client's sign-out request rejects. */
export async function signOutAndClearLocalState(
  signOut: () => Promise<unknown>,
  clearLocalState: () => void,
): Promise<void> {
  try {
    await signOut()
  } catch {
    // The caller's in-memory and persisted user state must still be removed.
  } finally {
    clearLocalState()
  }
}
