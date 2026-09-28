import type { ZhuzId } from "./zhuzRu";

export type MediaRef = {
  tx: string;
  kind: "image" | "document" | "audio" | "other";
  caption?: string;
};

export type Person = {
  id: string;
  name: string;
  sex?: "M" | "F" | "U";
  /** Birth date ISO yyyy-mm-dd */
  born?: string | null;
  /** Death date ISO yyyy-mm-dd */
  died?: string | null;
  /** @deprecated use birthPlace */
  place?: { lat?: number; lon?: number; label?: string } | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  burialDate?: string | null;
  burialPlace?: string | null;
  occupation?: string | null;
  maidenName?: string | null;
  parents: string[];
  media: MediaRef[];
  notes?: string;
  tombstone?: boolean;
};

export type Snapshot = {
  persons: Record<string, Person>;
};

export type Commit = {
  schema: "sejire/commit/v1";
  tree_id: string;
  commit_id: string;
  parent_commit_id: string | null;
  version: number;
  author: string;
  created_at: string;
  message: string;
  snapshot: Snapshot;
};

export type TreeMeta = {
  id: string;
  title: string;
  head: string | null;
  next_version: number;
  created_at: string;
  author: string;
  zhuz?: ZhuzId | null;
  /** Optional clan / ру name for Шежіре header. */
  clanName?: string | null;
  /** Optional tamga image as data URL or https URL (future UI). */
  tamgaUrl?: string | null;
};

export type TreeStore = {
  meta: TreeMeta;
  commits: Record<string, Commit>;
  versions: Record<number, string>;
  draft: Snapshot;
  dirty: boolean;
};

export type HistoryItem = {
  commit_id: string;
  version: number;
  parent_commit_id: string | null;
  author: string;
  created_at: string;
  message: string;
  person_count: number;
};
