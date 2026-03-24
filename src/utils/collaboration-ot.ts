import type { TextOperation, TextOperationType } from "@/types/collaboration";

function nowIso(): string {
  return new Date().toISOString();
}

function buildOperation(
  type: TextOperationType,
  userId: string,
  position: number,
  clientVersion: number,
  options: { content?: string; length?: number } = {},
): TextOperation {
  return {
    id: crypto.randomUUID(),
    type,
    position,
    content: options.content,
    length: options.length ?? options.content?.length ?? 0,
    userId,
    clientVersion,
    timestamp: nowIso(),
  };
}

export function applyOperation(content: string, operation: TextOperation): string {
  const position = Math.max(0, Math.min(operation.position, content.length));

  if (operation.type === "INSERT") {
    return content.slice(0, position) + (operation.content ?? "") + content.slice(position);
  }

  if (operation.type === "DELETE") {
    const deleteLength = Math.max(0, operation.length);
    return content.slice(0, position) + content.slice(position + deleteLength);
  }

  return content;
}

export function computeTextOperations(
  oldContent: string,
  newContent: string,
  userId: string,
  clientVersion: number,
): TextOperation[] {
  if (oldContent === newContent) {
    return [];
  }

  let prefix = 0;
  const minLength = Math.min(oldContent.length, newContent.length);
  while (prefix < minLength && oldContent[prefix] === newContent[prefix]) {
    prefix++;
  }

  let oldSuffix = oldContent.length;
  let newSuffix = newContent.length;
  while (oldSuffix > prefix && newSuffix > prefix && oldContent[oldSuffix - 1] === newContent[newSuffix - 1]) {
    oldSuffix--;
    newSuffix--;
  }

  const removedLength = oldSuffix - prefix;
  const insertedContent = newContent.slice(prefix, newSuffix);
  const operations: TextOperation[] = [];

  if (removedLength > 0) {
    operations.push(buildOperation("DELETE", userId, prefix, clientVersion, { length: removedLength }));
  }

  if (insertedContent.length > 0) {
    operations.push(buildOperation("INSERT", userId, prefix, clientVersion, { content: insertedContent }));
  }

  return operations;
}

export function transformOperation(clientOp: TextOperation, serverOp: TextOperation | null): TextOperation {
  if (!serverOp) {
    return clientOp;
  }

  if (clientOp.type === "INSERT" && serverOp.type === "INSERT") {
    return transformInsertInsert(clientOp, serverOp);
  }

  if (clientOp.type === "INSERT" && serverOp.type === "DELETE") {
    return transformInsertDelete(clientOp, serverOp);
  }

  if (clientOp.type === "DELETE" && serverOp.type === "INSERT") {
    return transformDeleteInsert(clientOp, serverOp);
  }

  if (clientOp.type === "DELETE" && serverOp.type === "DELETE") {
    return transformDeleteDelete(clientOp, serverOp);
  }

  return clientOp;
}

export function rebaseRemoteOperation(
  remoteOperation: TextOperation,
  localOperations: TextOperation[],
): { remoteOperation: TextOperation; localOperations: TextOperation[] } {
  let rebasedRemote = remoteOperation;
  const rebasedLocals: TextOperation[] = [];

  for (const localOperation of localOperations) {
    const nextRemote = transformOperation(rebasedRemote, localOperation);
    const nextLocal = transformOperation(localOperation, rebasedRemote);
    rebasedRemote = nextRemote;
    if (shouldKeepOperation(nextLocal)) {
      rebasedLocals.push(nextLocal);
    }
  }

  return {
    remoteOperation: rebasedRemote,
    localOperations: rebasedLocals,
  };
}

function shouldKeepOperation(operation: TextOperation): boolean {
  return operation.type === "INSERT" || operation.length > 0;
}

function transformInsertInsert(clientOp: TextOperation, serverOp: TextOperation): TextOperation {
  const clientPos = clientOp.position;
  const serverPos = serverOp.position;
  const serverLen = serverOp.content?.length ?? 0;

  if (clientPos < serverPos) {
    return clientOp;
  }

  if (clientPos > serverPos + serverLen) {
    return { ...clientOp, position: clientPos + serverLen };
  }

  if (clientOp.userId.localeCompare(serverOp.userId) < 0) {
    return clientOp;
  }

  return { ...clientOp, position: clientPos + serverLen };
}

function transformInsertDelete(clientOp: TextOperation, serverOp: TextOperation): TextOperation {
  const clientPos = clientOp.position;
  const serverPos = serverOp.position;
  const serverLen = serverOp.length;

  if (clientPos <= serverPos) {
    return clientOp;
  }

  if (clientPos >= serverPos + serverLen) {
    return { ...clientOp, position: clientPos - serverLen };
  }

  return { ...clientOp, position: serverPos };
}

function transformDeleteInsert(clientOp: TextOperation, serverOp: TextOperation): TextOperation {
  const clientPos = clientOp.position;
  const clientLen = clientOp.length;
  const serverPos = serverOp.position;
  const serverLen = serverOp.content?.length ?? 0;

  if (clientPos >= serverPos) {
    return { ...clientOp, position: clientPos + serverLen };
  }

  if (clientPos + clientLen <= serverPos) {
    return clientOp;
  }

  return { ...clientOp, length: clientLen + serverLen };
}

function transformDeleteDelete(clientOp: TextOperation, serverOp: TextOperation): TextOperation {
  const clientPos = clientOp.position;
  const clientLen = clientOp.length;
  const serverPos = serverOp.position;
  const serverLen = serverOp.length;

  if (clientPos >= serverPos + serverLen) {
    return { ...clientOp, position: clientPos - serverLen };
  }

  if (clientPos + clientLen <= serverPos) {
    return clientOp;
  }

  if (clientPos >= serverPos && clientPos + clientLen <= serverPos + serverLen) {
    return { ...clientOp, position: serverPos, length: 0 };
  }

  if (clientPos < serverPos && clientPos + clientLen > serverPos + serverLen) {
    return { ...clientOp, position: serverPos, length: clientLen - serverLen };
  }

  if (clientPos < serverPos) {
    const overlap = clientPos + clientLen - serverPos;
    return { ...clientOp, length: clientLen - overlap };
  }

  const overlap = serverPos + serverLen - clientPos;
  return { ...clientOp, position: serverPos, length: clientLen - overlap };
}
