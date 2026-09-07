// Shared types for the trip-based packing app.
//
// A TabDef describes one tab on the checklist (Pre-Trip, Camping, Clothing, …).
// Tabs are stored in one of three PackingTemplate rows — "shared", "mel", or
// "kathy". Per-trip check state lives on PackingTrip.state as a flat
// { "<scope>:<itemId>": true } map.

export type ItemDef = {
  id: string;
  text: string;
};

export type SectionDef = {
  id: string;
  title: string;
  color?: string;
  items: ItemDef[];
};

export type MealDef = {
  id: string;
  name: string;
  note: string;
};

export type CarZoneDef = {
  id: string;
  label: string;
  items: ItemDef[];
};

export type CarSectionDef = {
  id: string;
  heading: string;
  zones: CarZoneDef[];
};

export type CarDef = {
  id: string;
  name: string;
  color: string;
  sections: CarSectionDef[];
};

export type TabDef = {
  id: string;
  label: string;
  color: string;
  onlyWhenCamping?: boolean;
  sections?: SectionDef[];
  meals?: MealDef[];
  cars?: CarDef[];
};

// "shared" tabs apply to the whole trip. "mel" / "kathy" are per-user.
export type Scope = 'shared' | 'mel' | 'kathy';

export type Templates = {
  shared: TabDef[];
  mel: TabDef[];
  kathy: TabDef[];
};

export type TripMeta = {
  id: string;
  name: string;
  tripDate: string;
  camping: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Trip = TripMeta & {
  state: Record<string, boolean>;
};

// Short random id for items/sections/etc. Stable across the lifetime of a
// template — used as check-state key so renames don't lose progress.
export function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function stateKey(scope: Scope, itemId: string): string {
  return `${scope}:${itemId}`;
}
