/**
 * Shared style class strings used by the SettingsControls family of files.
 * Lives in a .ts (no JSX) file so it can be imported by both the component
 * file and its sibling renderer without triggering Fast Refresh boundary rules.
 */

export const selectClass = 'w-40 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring appearance-none cursor-pointer [&>option]:bg-background [&>option]:text-foreground'
export const inputClass = 'w-40 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-ring text-right'
export const labelClass = 'text-xs text-muted-foreground'
export const rowClass = 'flex items-center py-1.5 gap-4'
export const helperClass = 'text-[10px] text-muted-foreground mt-0.5'
