/** Compact, collision-resistant id for sessions and messages. */
export function makeId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}
