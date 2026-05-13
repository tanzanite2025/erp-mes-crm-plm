/**
 * Unit tests for BOM Virtual Scroller Configuration
 * 
 * Tests the configuration validation and creation for the virtual scroller.
 * Target: ≥90% code coverage
 */

import { describe, expect, it } from 'vitest';
import {
  type BOMVirtualScrollerConfig,
  createVirtualScrollerConfig,
  DEFAULT_BOM_VIRTUAL_CONFIG,
  validateVirtualScrollerConfig,
  VirtualScrollerConfigError,
} from './virtual-scroller-config';

describe('DEFAULT_BOM_VIRTUAL_CONFIG', () => {
  it('provides optimized default configuration', () => {
    expect(DEFAULT_BOM_VIRTUAL_CONFIG).toEqual({
      overscan: 5,
      estimateSize: 48,
      enableDynamicSize: true,
      scrollThrottle: 16,
    });
  });

  it('passes validation', () => {
    expect(() => validateVirtualScrollerConfig(DEFAULT_BOM_VIRTUAL_CONFIG)).not.toThrow();
  });
});

describe('validateVirtualScrollerConfig', () => {
  describe('overscan validation', () => {
    it('accepts valid overscan values', () => {
      const validConfigs: BOMVirtualScrollerConfig[] = [
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, overscan: 0 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, overscan: 5 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, overscan: 10 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, overscan: 50 },
      ];

      validConfigs.forEach((config) => {
        expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
      });
    });

    it('rejects negative overscan', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        overscan: -1,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'overscan must be a non-negative integer'
      );
    });

    it('rejects non-integer overscan', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        overscan: 5.5,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'overscan must be a non-negative integer'
      );
    });

    it('rejects overscan values that are too large', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        overscan: 51,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'overscan is too large (51), maximum recommended value is 50'
      );
    });

    it('rejects overscan values that are too large (extreme case)', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        overscan: 1000,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'overscan is too large (1000), maximum recommended value is 50'
      );
    });
  });

  describe('estimateSize validation', () => {
    it('accepts valid estimateSize values', () => {
      const validConfigs: BOMVirtualScrollerConfig[] = [
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, estimateSize: 20 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, estimateSize: 48 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, estimateSize: 100 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, estimateSize: 200 },
      ];

      validConfigs.forEach((config) => {
        expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
      });
    });

    it('rejects zero estimateSize', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        estimateSize: 0,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'estimateSize must be a positive number'
      );
    });

    it('rejects negative estimateSize', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        estimateSize: -10,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'estimateSize must be a positive number'
      );
    });

    it('rejects estimateSize below recommended range', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        estimateSize: 19,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'estimateSize (19px) is outside recommended range (20-200px)'
      );
    });

    it('rejects estimateSize above recommended range', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        estimateSize: 201,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'estimateSize (201px) is outside recommended range (20-200px)'
      );
    });

    it('accepts decimal estimateSize values within range', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        estimateSize: 48.5,
      };

      expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    });
  });

  describe('enableDynamicSize validation', () => {
    it('accepts true', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        enableDynamicSize: true,
      };

      expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    });

    it('accepts false', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        enableDynamicSize: false,
      };

      expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    });

    it('rejects non-boolean values', () => {
      const config = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        enableDynamicSize: 'true' as any,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'enableDynamicSize must be a boolean'
      );
    });

    it('rejects null', () => {
      const config = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        enableDynamicSize: null as any,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'enableDynamicSize must be a boolean'
      );
    });

    it('rejects undefined', () => {
      const config = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        enableDynamicSize: undefined as any,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'enableDynamicSize must be a boolean'
      );
    });
  });

  describe('scrollThrottle validation', () => {
    it('accepts valid scrollThrottle values', () => {
      const validConfigs: BOMVirtualScrollerConfig[] = [
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, scrollThrottle: 8 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, scrollThrottle: 16 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, scrollThrottle: 50 },
        { ...DEFAULT_BOM_VIRTUAL_CONFIG, scrollThrottle: 100 },
      ];

      validConfigs.forEach((config) => {
        expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
      });
    });

    it('rejects zero scrollThrottle', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        scrollThrottle: 0,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'scrollThrottle must be a positive number'
      );
    });

    it('rejects negative scrollThrottle', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        scrollThrottle: -5,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'scrollThrottle must be a positive number'
      );
    });

    it('rejects scrollThrottle below recommended range', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        scrollThrottle: 7,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'scrollThrottle (7ms) is outside recommended range (8-100ms)'
      );
    });

    it('rejects scrollThrottle above recommended range', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        scrollThrottle: 101,
      };

      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        VirtualScrollerConfigError
      );
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'scrollThrottle (101ms) is outside recommended range (8-100ms)'
      );
    });

    it('accepts decimal scrollThrottle values within range', () => {
      const config: BOMVirtualScrollerConfig = {
        ...DEFAULT_BOM_VIRTUAL_CONFIG,
        scrollThrottle: 16.67,
      };

      expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    });
  });

  describe('combined validation', () => {
    it('validates all fields together', () => {
      const config: BOMVirtualScrollerConfig = {
        overscan: 10,
        estimateSize: 60,
        enableDynamicSize: false,
        scrollThrottle: 8,
      };

      expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    });

    it('reports first validation error when multiple fields are invalid', () => {
      const config: BOMVirtualScrollerConfig = {
        overscan: -1, // Invalid
        estimateSize: 0, // Invalid
        enableDynamicSize: true,
        scrollThrottle: 0, // Invalid
      };

      // Should throw error for overscan (first field checked)
      expect(() => validateVirtualScrollerConfig(config)).toThrow(
        'overscan must be a non-negative integer'
      );
    });
  });
});

describe('createVirtualScrollerConfig', () => {
  it('returns default configuration when called with no arguments', () => {
    const config = createVirtualScrollerConfig();

    expect(config).toEqual(DEFAULT_BOM_VIRTUAL_CONFIG);
  });

  it('returns default configuration when called with empty object', () => {
    const config = createVirtualScrollerConfig({});

    expect(config).toEqual(DEFAULT_BOM_VIRTUAL_CONFIG);
  });

  it('merges partial configuration with defaults', () => {
    const config = createVirtualScrollerConfig({
      overscan: 10,
    });

    expect(config).toEqual({
      overscan: 10,
      estimateSize: 48,
      enableDynamicSize: true,
      scrollThrottle: 16,
    });
  });

  it('overrides multiple default values', () => {
    const config = createVirtualScrollerConfig({
      overscan: 10,
      scrollThrottle: 8,
    });

    expect(config).toEqual({
      overscan: 10,
      estimateSize: 48,
      enableDynamicSize: true,
      scrollThrottle: 8,
    });
  });

  it('overrides all default values', () => {
    const config = createVirtualScrollerConfig({
      overscan: 10,
      estimateSize: 60,
      enableDynamicSize: false,
      scrollThrottle: 8,
    });

    expect(config).toEqual({
      overscan: 10,
      estimateSize: 60,
      enableDynamicSize: false,
      scrollThrottle: 8,
    });
  });

  it('validates the merged configuration', () => {
    expect(() =>
      createVirtualScrollerConfig({
        overscan: -1, // Invalid
      })
    ).toThrow(VirtualScrollerConfigError);
  });

  it('throws validation error for invalid partial config', () => {
    expect(() =>
      createVirtualScrollerConfig({
        estimateSize: 0, // Invalid
      })
    ).toThrow(VirtualScrollerConfigError);
  });

  it('creates configuration for high-performance scrolling (120 FPS)', () => {
    const config = createVirtualScrollerConfig({
      scrollThrottle: 8, // ~120 FPS
      overscan: 10, // More buffer for faster scrolling
    });

    expect(config.scrollThrottle).toBe(8);
    expect(config.overscan).toBe(10);
  });

  it('creates configuration for memory-constrained environments', () => {
    const config = createVirtualScrollerConfig({
      overscan: 2, // Minimal buffer
      enableDynamicSize: false, // Disable dynamic sizing for performance
    });

    expect(config.overscan).toBe(2);
    expect(config.enableDynamicSize).toBe(false);
  });

  it('creates configuration for large row heights', () => {
    const config = createVirtualScrollerConfig({
      estimateSize: 120, // Larger rows
      overscan: 3, // Fewer rows needed in buffer
    });

    expect(config.estimateSize).toBe(120);
    expect(config.overscan).toBe(3);
  });
});

describe('VirtualScrollerConfigError', () => {
  it('is an instance of Error', () => {
    const error = new VirtualScrollerConfigError('test error');

    expect(error).toBeInstanceOf(Error);
  });

  it('has correct name', () => {
    const error = new VirtualScrollerConfigError('test error');

    expect(error.name).toBe('VirtualScrollerConfigError');
  });

  it('preserves error message', () => {
    const message = 'Invalid configuration';
    const error = new VirtualScrollerConfigError(message);

    expect(error.message).toBe(message);
  });

  it('can be caught specifically', () => {
    try {
      throw new VirtualScrollerConfigError('test error');
    } catch (error) {
      expect(error).toBeInstanceOf(VirtualScrollerConfigError);
      expect((error as VirtualScrollerConfigError).name).toBe(
        'VirtualScrollerConfigError'
      );
    }
  });
});

describe('Integration scenarios', () => {
  it('creates configuration for typical BOM table (1000 rows)', () => {
    const config = createVirtualScrollerConfig({
      overscan: 5,
      estimateSize: 48,
      enableDynamicSize: true,
      scrollThrottle: 16,
    });

    expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    expect(config.overscan).toBe(5);
    expect(config.estimateSize).toBe(48);
  });

  it('creates configuration for large BOM table (2000+ rows)', () => {
    const config = createVirtualScrollerConfig({
      overscan: 3, // Reduce buffer for memory efficiency
      estimateSize: 48,
      enableDynamicSize: true,
      scrollThrottle: 16,
    });

    expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    expect(config.overscan).toBe(3);
  });

  it('creates configuration for nested BOM with variable row heights', () => {
    const config = createVirtualScrollerConfig({
      overscan: 5,
      estimateSize: 60, // Larger estimate for nested rows
      enableDynamicSize: true, // Required for variable heights
      scrollThrottle: 16,
    });

    expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    expect(config.enableDynamicSize).toBe(true);
    expect(config.estimateSize).toBe(60);
  });

  it('creates configuration for mobile devices', () => {
    const config = createVirtualScrollerConfig({
      overscan: 3, // Smaller buffer for mobile
      estimateSize: 56, // Larger touch targets
      enableDynamicSize: true,
      scrollThrottle: 16,
    });

    expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    expect(config.overscan).toBe(3);
    expect(config.estimateSize).toBe(56);
  });

  it('validates configuration from environment variables', () => {
    // Simulate configuration from environment variables
    const envConfig = {
      overscan: parseInt('10', 10),
      estimateSize: parseFloat('48.5'),
      enableDynamicSize: 'true' === 'true',
      scrollThrottle: parseInt('16', 10),
    };

    const config = createVirtualScrollerConfig(envConfig);

    expect(() => validateVirtualScrollerConfig(config)).not.toThrow();
    expect(config.overscan).toBe(10);
    expect(config.estimateSize).toBe(48.5);
    expect(config.enableDynamicSize).toBe(true);
    expect(config.scrollThrottle).toBe(16);
  });
});

describe('Performance characteristics', () => {
  it('validates configuration quickly', () => {
    const config = DEFAULT_BOM_VIRTUAL_CONFIG;
    const iterations = 10000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      validateVirtualScrollerConfig(config);
    }
    const duration = performance.now() - start;

    // Should validate 10,000 configs in less than 100ms
    expect(duration).toBeLessThan(100);
  });

  it('creates configuration quickly', () => {
    const iterations = 10000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      createVirtualScrollerConfig({ overscan: 5 });
    }
    const duration = performance.now() - start;

    // Should create 10,000 configs in less than 100ms
    expect(duration).toBeLessThan(100);
  });
});
