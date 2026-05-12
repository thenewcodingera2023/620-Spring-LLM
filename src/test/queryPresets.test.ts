// Stage 6A — tests for the preset query data.
//
// These are pure data-validation tests: shapes, uniqueness, lookups, and the locked rejection
// copy. No store / component rendering involved.

import { describe, expect, it } from 'vitest';
import {
  PRESET_REJECTION_COPY,
  findPresetById,
  findPresetByLabel,
  queryPresets,
  type QueryPreset,
} from '../data/queryPresets';
import { norm } from '../math/linalg';

describe('queryPresets data', () => {
  it('is non-empty', () => {
    expect(queryPresets.length).toBeGreaterThan(0);
  });

  it('ids are unique', () => {
    const ids = queryPresets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels are unique (case-insensitive)', () => {
    const labels = queryPresets.map((p) => p.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('every preset has a length-2 vector2D and length-3 vector3D with finite, positive norm', () => {
    for (const p of queryPresets) {
      expect(p.vector2D).toHaveLength(2);
      expect(p.vector3D).toHaveLength(3);
      const n2 = norm(p.vector2D);
      const n3 = norm(p.vector3D);
      expect(Number.isFinite(n2)).toBe(true);
      expect(Number.isFinite(n3)).toBe(true);
      expect(n2).toBeGreaterThan(0);
      expect(n3).toBeGreaterThan(0);
    }
  });

  it('every preset has an id, label, and description', () => {
    for (const p of queryPresets) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });
});

describe('findPresetByLabel', () => {
  it('returns the matching preset for exact label', () => {
    const target = queryPresets[0];
    const found = findPresetByLabel(target.label);
    expect(found).toBe(target);
  });

  it('is case-insensitive', () => {
    const target = queryPresets[0];
    const found = findPresetByLabel(target.label.toUpperCase());
    expect(found).toBe(target);
  });

  it('trims whitespace', () => {
    const target = queryPresets[0];
    const found = findPresetByLabel(`  ${target.label}  `);
    expect(found).toBe(target);
  });

  it('returns null for unknown input', () => {
    expect(findPresetByLabel('puppy')).toBeNull();
    expect(findPresetByLabel('not a preset')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(findPresetByLabel('')).toBeNull();
    expect(findPresetByLabel('   ')).toBeNull();
  });
});

describe('findPresetById', () => {
  it('returns the matching preset', () => {
    const target: QueryPreset = queryPresets[1];
    expect(findPresetById(target.id)).toBe(target);
  });

  it('returns null for unknown id', () => {
    expect(findPresetById('nope-not-a-preset')).toBeNull();
  });
});

describe('PRESET_REJECTION_COPY', () => {
  it('matches the spec string verbatim', () => {
    expect(PRESET_REJECTION_COPY).toBe(
      'This demo only supports preset queries. Arbitrary text embeddings are future work.',
    );
  });
});
