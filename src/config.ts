// Drone Infrastructure Inspector - Centralized API Configuration
// When running in dev, defaults to http://localhost:5001.
// When deployed behind a reverse proxy (e.g. Nginx, Docker), defaults to "" (same-origin relative paths).
// Can be explicitly overridden via the VITE_API_BASE_URL environment variable.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.PROD
    ? ""
    : "http://localhost:5001";

// Local fallback shown when an asset has no thumbnail or its image URL fails to load.
export const PLACEHOLDER_IMAGE = "/placeholder-asset.svg";

export const onImageError = (e: { currentTarget: HTMLImageElement }) => {
  const img = e.currentTarget;
  if (!img.src.endsWith(PLACEHOLDER_IMAGE)) img.src = PLACEHOLDER_IMAGE;
};
