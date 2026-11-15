/**
 * A full page load of `path`. Used after saving a setting the garden
 * layout renders on the server (the app language and its messages, the
 * meaning language): a soft `router.push` keeps the layout from the
 * client's router cache, and a `router.refresh()` started just before the
 * push is dropped by it, so the old language stayed on screen until the
 * next reload. Its own module so tests can replace it.
 */
export function reloadTo(path: string): void {
  window.location.assign(path);
}
