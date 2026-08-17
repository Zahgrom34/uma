/** A savable card registers itself with the page for ⌘S + the dirty guard. */
export interface CardController {
  isDirty: () => boolean
  save: () => void
}
