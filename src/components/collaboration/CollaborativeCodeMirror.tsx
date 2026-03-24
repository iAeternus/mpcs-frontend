import { useMemo } from "react";
import ReactCodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState, type Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import type { EditingLockResponse } from "@/types/collaboration";

interface SelectionRange {
  start: number;
  end: number;
}

interface CollaborativeCodeMirrorProps {
  value: string;
  onChange: (value: string) => void;
  currentUserId: string;
  locks: EditingLockResponse[];
  onSelectionChange?: (range: SelectionRange) => void;
  onBlur?: () => void;
  onBlockedEdit?: (lock: EditingLockResponse) => void;
}

class LockBadgeWidget extends WidgetType {
  private readonly label: string;
  private readonly color: string;

  constructor(label: string, color: string) {
    super();
    this.label = label;
    this.color = color;
  }

  override eq(other: LockBadgeWidget): boolean {
    return other.label === this.label && other.color === this.color;
  }

  override toDOM(): HTMLElement {
    const container = document.createElement("span");
    container.style.display = "inline-block";
    container.style.position = "relative";
    container.style.width = "0";
    container.style.height = "0";
    container.style.overflow = "visible";
    container.style.pointerEvents = "none";
    container.style.verticalAlign = "top";

    const badge = document.createElement("span");
    badge.textContent = `${this.label} 正在编辑`;
    badge.style.position = "absolute";
    badge.style.left = "0";
    badge.style.top = "-24px";
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.padding = "2px 8px";
    badge.style.borderRadius = "999px";
    badge.style.fontSize = "11px";
    badge.style.lineHeight = "16px";
    badge.style.fontWeight = "700";
    badge.style.whiteSpace = "nowrap";
    badge.style.color = this.color;
    badge.style.background = toAlphaColor(this.color, 0.16);
    badge.style.border = `1px solid ${toAlphaColor(this.color, 0.32)}`;
    badge.style.boxShadow = `0 4px 10px ${toAlphaColor(this.color, 0.12)}`;
    badge.style.transform = "translateX(4px)";
    container.appendChild(badge);

    const caret = document.createElement("span");
    caret.style.position = "absolute";
    caret.style.left = "0";
    caret.style.top = "-1px";
    caret.style.display = "inline-block";
    caret.style.width = "2px";
    caret.style.height = "20px";
    caret.style.borderRadius = "999px";
    caret.style.background = this.color;
    container.appendChild(caret);

    return container;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

function getUserColor(userId: string): string {
  const colors = [
    "#1677ff",
    "#52c41a",
    "#fa8c16",
    "#f5222d",
    "#13c2c2",
    "#eb2f96",
    "#722ed1",
    "#a0d911",
  ];
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) % colors.length;
  }
  return colors[Math.abs(hash) % colors.length];
}

function toAlphaColor(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function clampPosition(position: number, docLength: number): number {
  return Math.max(0, Math.min(position, docLength));
}

function buildDecorations(locks: EditingLockResponse[], currentUserId: string, docLength: number) {
  const builder = new RangeSetBuilder<Decoration>();
  const sortedLocks = [...locks]
    .filter((lock) => lock.userId !== currentUserId)
    .sort((left, right) => {
      if (left.start !== right.start) {
        return left.start - right.start;
      }
      if (left.end !== right.end) {
        return left.end - right.end;
      }
      return left.lockId.localeCompare(right.lockId);
    });

  for (const lock of sortedLocks) {
    const start = clampPosition(lock.start, docLength);
    const end = clampPosition(Math.max(lock.start, lock.end), docLength);
    const color = getUserColor(lock.userId);

    builder.add(
      start,
      start,
      Decoration.widget({
        widget: new LockBadgeWidget(lock.username, color),
        side: -1,
      }),
    );

    if (start < end) {
      builder.add(
        start,
        end,
        Decoration.mark({
          attributes: {
            style: [
              `background:${toAlphaColor(color, 0.16)}`,
              `border-bottom:2px solid ${toAlphaColor(color, 0.9)}`,
              `box-shadow:inset 0 0 0 1px ${toAlphaColor(color, 0.16)}`,
              "border-radius:3px",
            ].join(";"),
          },
        }),
      );
    } else {
      builder.add(
        start,
        start,
        Decoration.mark({
          attributes: {
            style: `border-left:2px solid ${color}; margin-left:-1px;`,
          },
        }),
      );
    }
  }

  return builder.finish();
}

function findConflictingLock(
  locks: EditingLockResponse[],
  currentUserId: string,
  from: number,
  to: number,
): EditingLockResponse | null {
  for (const lock of locks) {
    if (lock.userId === currentUserId) {
      continue;
    }

    if (from === to) {
      if (lock.start <= from && from <= lock.end) {
        return lock;
      }
      continue;
    }

    if (lock.start === lock.end) {
      if (from <= lock.start && lock.start <= to) {
        return lock;
      }
      continue;
    }

    if (from < lock.end && lock.start < to) {
      return lock;
    }
  }
  return null;
}

function createExtensions(
  locks: EditingLockResponse[],
  currentUserId: string,
  docLength: number,
  onSelectionChange?: (range: SelectionRange) => void,
  onBlur?: () => void,
  onBlockedEdit?: (lock: EditingLockResponse) => void,
): Extension[] {
  const decorationSet = buildDecorations(locks, currentUserId, docLength);
  const decorationExtension = EditorView.decorations.of(decorationSet);
  const blockEditExtension = EditorState.transactionFilter.of((transaction) => {
    if (!transaction.docChanged) {
      return transaction;
    }

    let conflict: EditingLockResponse | null = null;
    transaction.changes.iterChanges((fromA, toA) => {
      if (conflict) {
        return;
      }
      conflict = findConflictingLock(locks, currentUserId, fromA, toA);
    });

    if (conflict) {
      onBlockedEdit?.(conflict);
      return [];
    }

    return transaction;
  });

  const listener = EditorView.updateListener.of((update) => {
    if (update.selectionSet) {
      const selection = update.state.selection.main;
      onSelectionChange?.({ start: selection.from, end: selection.to });
    }

    if (update.focusChanged && !update.view.hasFocus) {
      onBlur?.();
    }
  });

  const theme = EditorView.theme({
    "&": {
      height: "100%",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      backgroundColor: "var(--color-surface-primary)",
      color: "var(--color-text-primary)",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--font-mono)",
    },
    ".cm-content": {
      minHeight: "100%",
      padding: "16px",
      caretColor: "#1677ff",
    },
    ".cm-focused": {
      outline: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(22, 119, 255, 0.04)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(22, 119, 255, 0.06)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-surface-secondary)",
      color: "var(--color-text-tertiary)",
      border: "none",
      borderRight: "1px solid var(--color-border-default)",
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(22, 119, 255, 0.16)",
    },
  });

  return [markdown(), EditorView.lineWrapping, decorationExtension, blockEditExtension, listener, theme];
}

const CollaborativeCodeMirror = ({
  value,
  onChange,
  currentUserId,
  locks,
  onSelectionChange,
  onBlur,
  onBlockedEdit,
}: CollaborativeCodeMirrorProps) => {
  const extensions = useMemo(
    () => createExtensions(locks, currentUserId, value.length, onSelectionChange, onBlur, onBlockedEdit),
    [currentUserId, locks, onBlockedEdit, onBlur, onSelectionChange, value.length],
  );

  return (
    <ReactCodeMirror
      value={value}
      height="100%"
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: true,
      }}
      extensions={extensions}
      onChange={onChange}
    />
  );
};

export default CollaborativeCodeMirror;
