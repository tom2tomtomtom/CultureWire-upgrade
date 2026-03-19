import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for the brand context module.
 *
 * buildBrandContextPrompt is not exported (private function), so we test:
 * 1. The module can be imported without error
 * 2. The source file contains required prompt instructions
 * 3. The exported generateBrandContext function exists
 *
 * We do NOT call generateBrandContext since it requires the Anthropic API.
 */

const BRAND_CONTEXT_PATH = path.resolve(__dirname, '../lib/culture-wire/brand-context.ts');

describe('brand-context module', () => {
  it('source file exists', () => {
    expect(fs.existsSync(BRAND_CONTEXT_PATH)).toBe(true);
  });

  describe('prompt contains required instructions', () => {
    const source = fs.readFileSync(BRAND_CONTEXT_PATH, 'utf-8');

    it('instructs to include the exact brand name as first keyword', () => {
      expect(source).toContain('MUST include the exact brand name');
    });

    it('instructs NOT to include generic industry terms', () => {
      expect(source).toContain('Do NOT include generic industry terms');
    });

    it('includes Officeworks as an example of correct keyword usage', () => {
      expect(source).toContain('Officeworks');
    });

    it('requires competitors to actually operate in the target market', () => {
      expect(source).toContain("don't have a presence in this market");
    });

    it('includes brand_positioning in the JSON schema', () => {
      expect(source).toContain('brand_positioning');
    });

    it('includes tone in the JSON schema', () => {
      expect(source).toContain('"tone"');
    });

    it('requires brand, category, and trending keyword sections', () => {
      expect(source).toContain('"brand"');
      expect(source).toContain('"category"');
      expect(source).toContain('"trending"');
    });

    it('includes geo-specific market labels', () => {
      expect(source).toContain('AU');
      expect(source).toContain('Australia');
      expect(source).toContain('US');
      expect(source).toContain('United States');
      expect(source).toContain('GB');
      expect(source).toContain('United Kingdom');
    });
  });

  it('exports generateBrandContext as an async function', async () => {
    // Dynamic import to verify the module loads without error
    const mod = await import('@/lib/culture-wire/brand-context');
    expect(mod.generateBrandContext).toBeTypeOf('function');
  });
});
