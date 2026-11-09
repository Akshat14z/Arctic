/** The app's few line icons (24px grid, 1.8 stroke, currentColor), drawn once so every screen uses the same set. */
const PATHS = {
  home: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  browse: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 2-4.35-4.35",
  chats: "M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3V6a1 1 0 0 1 1-1z",
  sell: "M12 5v14M5 12h14",
  dispatch: "M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3M4 13v4a2 2 0 0 0 2 2h1v-6H4",
  go: "M8 16 16 8M9 8h7v7",
  back: "M15 5l-7 7 7 7",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
