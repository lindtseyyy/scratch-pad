export function buzz() {
  try {
    navigator.vibrate?.(10)
  } catch {
    // Haptics are best-effort.
  }
}
