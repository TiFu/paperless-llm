import type { EntityValue } from '@/services/api/generated';

export const EMPTY_VALUE = '(empty)';

export function parseEnumIds(value: string | null): (string | number)[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function entityValueMatches(item: EntityValue, value: string | number): boolean {
  const strVal = String(value);
  return String(item.id) === strVal || item.name === strVal;
}

export function findEntityByValue(
  value: string | number,
  entityItems: EntityValue[]
): EntityValue | undefined {
  return entityItems.find((item) => entityValueMatches(item, value));
}

export function resolveEntityName(
  value: string | number,
  entityItems: EntityValue[]
): string {
  return findEntityByValue(value, entityItems)?.name ?? String(value);
}

export function toEntityValue(value: string | number, index = 0): EntityValue {
  const found = Number(value);
  return {
    id: Number.isFinite(found) ? found : -(index + 1),
    name: String(value),
  };
}

export function resolveEntityValues(
  values: (string | number)[],
  entityItems: EntityValue[]
): EntityValue[] {
  return values.map((value, index) => findEntityByValue(value, entityItems) ?? toEntityValue(value, index));
}

export function mergeEntityOptions(
  entityItems: EntityValue[],
  extraItems: EntityValue[]
): EntityValue[] {
  const seen = new Set(entityItems.map((item) => item.id));
  return [...entityItems, ...extraItems.filter((item) => !seen.has(item.id))];
}
