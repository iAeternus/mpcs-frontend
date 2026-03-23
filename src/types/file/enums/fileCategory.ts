export const FileCategory = {
  IMAGE: "IMAGE",
  DOCUMENT: "DOCUMENT",
  TEXT: "TEXT",
  ARCHIVE: "ARCHIVE",
  MEDIA: "MEDIA",
  EXECUTABLE: "EXECUTABLE",
  UNKNOWN: "UNKNOWN",
} as const;

export type FileCategory = typeof FileCategory[keyof typeof FileCategory];

export const COLLABORATION_SUPPORTED_CATEGORIES: FileCategory[] = [
  FileCategory.TEXT,
];

export function isCollaborationSupported(category: FileCategory): boolean {
  return COLLABORATION_SUPPORTED_CATEGORIES.includes(category);
}
