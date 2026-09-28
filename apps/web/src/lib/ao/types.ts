/**
 * AO message shapes used by SEJIRE Tree / Factory.
 * Spec: docs/PROTOCOL.md, docs/processes/MESSAGE_CATALOG.md
 */

export const PROTOCOL_RELEASE = "sejire/v0.3";
export const TREE_PROTOCOL = "sejire/tree/v1";
export const FACTORY_PROTOCOL = "sejire/factory/v1";
export const APP_NAME = "SEJIRE";
export const JETI_ATA_MAX = 7;

export type AoTag = { name: string; value: string };

export type AoMsg = {
  Id?: string;
  From: string;
  Timestamp?: string;
  Data?: string;
  Tags: Record<string, string>;
};

export type AoReply = {
  Data: string;
  Tags: Record<string, string>;
};

export type TreeCommitPayload = {
  message?: string;
  parent_commit_id?: string | null;
  title?: string;
  snapshot: { persons: Record<string, unknown> };
};

export type AncestorItem = { id: string; distance: number };

export type JetiAtaPerson = {
  generation: number;
  id: string;
  name: string;
  sex?: string;
  born?: string | null;
  died?: string | null;
};

export function appTags(): AoTag[] {
  return [
    { name: "App-Name", value: APP_NAME },
    { name: "Protocol", value: PROTOCOL_RELEASE },
  ];
}

export function encodeTreeMessage(
  action: string,
  extraTags: Record<string, string> = {},
  data?: string
): { tags: AoTag[]; data: string } {
  const tags: AoTag[] = [...appTags(), { name: "Action", value: action }];
  for (const [name, value] of Object.entries(extraTags)) {
    if (value !== undefined && value !== "") tags.push({ name, value });
  }
  if (data) tags.push({ name: "Content-Type", value: "application/json" });
  return { tags, data: data ?? "" };
}

export function tagsToRecord(tags: AoTag[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tags) out[t.name] = t.value;
  return out;
}

export function parseReplyJson<T>(reply: AoReply): T {
  if (!reply.Data) return {} as T;
  return JSON.parse(reply.Data) as T;
}

export function isErrorReply(reply: AoReply): boolean {
  return reply.Tags.Action === "Error";
}
