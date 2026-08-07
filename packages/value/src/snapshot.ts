import type { ValueKnobs } from './types.js';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortKeys(nestedValue)]),
    );
  }

  return value;
}

export function snapshotKnobs(knobs: ValueKnobs): string {
  return JSON.stringify(sortKeys(knobs));
}
