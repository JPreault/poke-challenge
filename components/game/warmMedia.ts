/** Prefetch an image into the browser cache. Resolves on load or error. */
export function warmImage(url: string): Promise<void> {
  if (!url || typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function warmImages(urls: Array<string | undefined | null>): Promise<void> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  if (unique.length === 0) return Promise.resolve();
  return Promise.all(unique.map(warmImage)).then(() => undefined);
}

/** Prefetch audio so the first play is not cold. Resolves on canplaythrough or error. */
export function preloadAudio(url: string): Promise<void> {
  if (!url || typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "auto";
    const done = () => {
      audio.removeEventListener("canplaythrough", done);
      audio.removeEventListener("error", done);
      resolve();
    };
    audio.addEventListener("canplaythrough", done);
    audio.addEventListener("error", done);
    audio.src = url;
    audio.load();
  });
}

export function preloadAudios(urls: Array<string | undefined | null>): Promise<void> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  if (unique.length === 0) return Promise.resolve();
  return Promise.all(unique.map(preloadAudio)).then(() => undefined);
}
