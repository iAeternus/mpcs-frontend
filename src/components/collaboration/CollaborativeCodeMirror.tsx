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
  private readonly isSelf: boolean;

  constructor(label: string, color: string, isSelf: boolean) {
    super();
    this.label = label;
    this.color = color;
    this.isSelf = isSelf;
  }

  override eq(other: LockBadgeWidget): boolean {
    return other.label === this.label && other.color === this.color && other.isSelf === this.isSelf;
  }

  override toDOM(): HTMLElement {
    const element = document.createElement("span");
    element.textContent = this.isSelf ? `${this.label} 正在编辑` : `${this.label} 已锁定`;
    element.style.display = "inline-flex";
    element.style.alignItems = "center";
    element.style.marginRight = "6px";
    element.style.padding = "1px 6px";
    element.style.borderRadius = "999px";
    element.style.fontSize = "11px";
    element.style.lineHeight = "16px";
    element.style.fontWeight = "600";
    element.style.color = this.color;
    element.style.background = toAlphaColor(this.color, this.isSelf ? 0.14 : 0.18);
    element.style.border = `1px solid ${toAlphaColor(this.color, 0.3)}`;
    return element;
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

function buildDecorations(locks: EditingLockResponse[], currentUserId: string) {
  const builder = new RangeSetBuilder<Decoration>();
  const sortedLocks = [...locks].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }
    if (left.end !== right.end) {
      return left.end - right.end;
    }
    return left.lockId.localeCompare(right.lockId);
  });

  for (const lock of sortedLocks) {
    const start = Math.max(0, lock.start);
    const end = Math.max(start, lock.end);
    const color = getUserColor(lock.userId);
    const isSelf = lock.userId === currentUserId;
    const highlight = Decoration.mark({
      attributes: {
        style: [
          `background:${toAlphaColor(color, isSelf ? 0.1 : 0.18)}`,
          `border-bottom:2px solid ${toAlphaColor(color, 0.9)}`,
          "border-radius:2px",
        ].join(";"),
      },
    });

    builder.add(
      start,
      start,
      Decoration.widget({
        widget: new LockBadgeWidget(lock.username, color, isSelf),
        side: -1,
      }),
    );

    if (start < end) {
      builder.add(start, end, highlight);
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
  onSelectionChange?: (range: SelectionRange) => void,
  onBlur?: () => void,
  onBlockedEdit?: (lock: EditingLockResponse) => void,
): Extension[] {
  const decorationSet = buildDecorations(locks, currentUserId);
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
  return (
    <ReactCodeMirror
      value={value}
      height="100%"
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: true,
      }}
      extensions={createExtensions(locks, currentUserId, onSelectionChange, onBlur, onBlockedEdit)}
      onChange={onChange}
    />
  );
};

export default CollaborativeCodeMirror;
