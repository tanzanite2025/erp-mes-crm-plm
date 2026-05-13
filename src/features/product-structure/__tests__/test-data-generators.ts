/**
 * Test Data Generators for BOM Performance Testing
 * 
 * Generates realistic BOM test data for performance benchmarks and integration tests.
 * 
 * Features:
 * - Generate BOM rows with various sizes (100, 500, 1000, 2000+)
 * - Support nested BOM structures
 * - Support dirty row percentage configuration
 * - Generate realistic field values
 */

import type { BOMRowData } from '../hooks/use-bom-data';

/**
 * Configuration for BOM row generation
 */
export interface GenerateBOMRowsConfig {
  /**
   * Number of rows to generate
   */
  rowCount: number;
  
  /**
   * Percentage of rows to mark as dirty (0-100)
   * Default: 0
   */
  dirtyPercentage?: number;
  
  /**
   * Enable nested BOM structure
   * Default: false
   */
  enableNesting?: boolean;
  
  /**
   * Maximum nesting depth
   * Default: 3
   */
  maxNestingDepth?: number;
  
  /**
   * Seed for reproducible random generation
   * Default: Date.now()
   */
  seed?: number;
  
  /**
   * Include all fields (for comprehensive testing)
   * Default: false
   */
  includeAllFields?: boolean;
}

/**
 * BOM row field types
 */
export interface BOMRowFields extends BOMRowData {
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  materialType: string;
  supplier?: string;
  cost?: number;
  leadTime?: number;
  notes?: string;
  level?: number;
  parentId?: string;
}

/**
 * Simple seeded random number generator
 * Uses Linear Congruential Generator (LCG) algorithm
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  /**
   * Pick random item from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Material types for BOM items
 */
const MATERIAL_TYPES = [
  '原材料',
  '半成品',
  '成品',
  '辅料',
  '包装材料',
  '工具',
  '标准件',
  '外购件',
];

/**
 * Units for BOM items
 */
const UNITS = [
  '个',
  '件',
  'kg',
  'g',
  'm',
  'cm',
  '套',
  '箱',
  '包',
  'L',
];

/**
 * Suppliers for BOM items
 */
const SUPPLIERS = [
  '供应商A',
  '供应商B',
  '供应商C',
  '供应商D',
  '供应商E',
  '供应商F',
  '供应商G',
  '供应商H',
];

/**
 * Generate a single BOM row
 */
function generateBOMRow(
  index: number,
  random: SeededRandom,
  config: Required<GenerateBOMRowsConfig>,
  level: number = 0,
  parentId?: string
): BOMRowFields {
  const id = `row-${index}`;
  const partNumber = `PN-${String(index).padStart(6, '0')}`;
  const description = `零件 ${index} - ${random.pick(['A型', 'B型', 'C型', 'D型'])}`;
  const quantity = random.nextInt(1, 100);
  const unit = random.pick(UNITS);
  const materialType = random.pick(MATERIAL_TYPES);
  
  const row: BOMRowFields = {
    id,
    partNumber,
    description,
    quantity,
    unit,
    materialType,
    level,
  };
  
  if (parentId) {
    row.parentId = parentId;
  }
  
  if (config.includeAllFields) {
    row.supplier = random.pick(SUPPLIERS);
    row.cost = random.nextInt(10, 10000) / 10; // 1.0 to 1000.0
    row.leadTime = random.nextInt(1, 90); // 1 to 90 days
    row.notes = random.next() > 0.7 ? `备注 ${index}` : undefined;
  }
  
  return row;
}

/**
 * Generate nested BOM structure
 */
function generateNestedRows(
  startIndex: number,
  count: number,
  random: SeededRandom,
  config: Required<GenerateBOMRowsConfig>,
  level: number = 0,
  parentId?: string
): BOMRowFields[] {
  const rows: BOMRowFields[] = [];
  let currentIndex = startIndex;
  
  for (let i = 0; i < count; i++) {
    const row = generateBOMRow(currentIndex, random, config, level, parentId);
    rows.push(row);
    currentIndex++;
    
    // Add children if nesting is enabled and not at max depth
    if (config.enableNesting && level < config.maxNestingDepth) {
      // 30% chance to have children
      if (random.next() < 0.3) {
        const childCount = random.nextInt(1, 3);
        const children = generateNestedRows(
          currentIndex,
          childCount,
          random,
          config,
          level + 1,
          row.id
        );
        rows.push(...children);
        currentIndex += children.length;
      }
    }
  }
  
  return rows;
}

/**
 * Mark rows as dirty by modifying their values
 */
function markRowsAsDirty(
  rows: BOMRowFields[],
  dirtyPercentage: number,
  random: SeededRandom
): BOMRowFields[] {
  if (dirtyPercentage <= 0) {
    return rows;
  }
  
  const dirtyCount = Math.floor(rows.length * (dirtyPercentage / 100));
  const dirtyIndices = new Set<number>();
  
  // Select random rows to mark as dirty
  while (dirtyIndices.size < dirtyCount) {
    dirtyIndices.add(random.nextInt(0, rows.length - 1));
  }
  
  // Modify dirty rows
  return rows.map((row, index) => {
    if (dirtyIndices.has(index)) {
      return {
        ...row,
        quantity: row.quantity + random.nextInt(-10, 10),
        description: `${row.description} (已修改)`,
      };
    }
    return row;
  });
}

/**
 * Generate BOM rows for testing
 * 
 * @param config - Configuration for row generation
 * @returns Array of generated BOM rows
 * 
 * @example
 * ```typescript
 * // Generate 1000 rows with 10% dirty
 * const rows = generateBOMRows({
 *   rowCount: 1000,
 *   dirtyPercentage: 10,
 * });
 * 
 * // Generate nested structure
 * const nestedRows = generateBOMRows({
 *   rowCount: 500,
 *   enableNesting: true,
 *   maxNestingDepth: 3,
 * });
 * ```
 */
export function generateBOMRows(config: GenerateBOMRowsConfig): BOMRowFields[] {
  const fullConfig: Required<GenerateBOMRowsConfig> = {
    rowCount: config.rowCount,
    dirtyPercentage: config.dirtyPercentage ?? 0,
    enableNesting: config.enableNesting ?? false,
    maxNestingDepth: config.maxNestingDepth ?? 3,
    seed: config.seed ?? Date.now(),
    includeAllFields: config.includeAllFields ?? false,
  };
  
  const random = new SeededRandom(fullConfig.seed);
  
  // Generate rows
  let rows: BOMRowFields[];
  
  if (fullConfig.enableNesting) {
    rows = generateNestedRows(1, fullConfig.rowCount, random, fullConfig);
  } else {
    rows = Array.from({ length: fullConfig.rowCount }, (_, i) =>
      generateBOMRow(i + 1, random, fullConfig)
    );
  }
  
  // Mark rows as dirty if needed
  if (fullConfig.dirtyPercentage > 0) {
    rows = markRowsAsDirty(rows, fullConfig.dirtyPercentage, random);
  }
  
  return rows;
}

/**
 * Generate BOM rows with specific size presets
 */
export const BOMDataPresets = {
  /**
   * Small dataset (100 rows)
   */
  small: (dirtyPercentage: number = 0): BOMRowFields[] =>
    generateBOMRows({ rowCount: 100, dirtyPercentage }),
  
  /**
   * Medium dataset (500 rows)
   */
  medium: (dirtyPercentage: number = 0): BOMRowFields[] =>
    generateBOMRows({ rowCount: 500, dirtyPercentage }),
  
  /**
   * Large dataset (1000 rows)
   */
  large: (dirtyPercentage: number = 0): BOMRowFields[] =>
    generateBOMRows({ rowCount: 1000, dirtyPercentage }),
  
  /**
   * Extra large dataset (2000 rows)
   */
  extraLarge: (dirtyPercentage: number = 0): BOMRowFields[] =>
    generateBOMRows({ rowCount: 2000, dirtyPercentage }),
  
  /**
   * Nested structure (500 rows with 3 levels)
   */
  nested: (dirtyPercentage: number = 0): BOMRowFields[] =>
    generateBOMRows({
      rowCount: 500,
      dirtyPercentage,
      enableNesting: true,
      maxNestingDepth: 3,
    }),
  
  /**
   * Comprehensive (1000 rows with all fields)
   */
  comprehensive: (dirtyPercentage: number = 0): BOMRowFields[] =>
    generateBOMRows({
      rowCount: 1000,
      dirtyPercentage,
      includeAllFields: true,
    }),
};

/**
 * Generate BOM rows for performance benchmarking
 * Returns multiple datasets with different sizes and dirty percentages
 */
export function generateBenchmarkDatasets(): {
  name: string;
  rows: BOMRowFields[];
  dirtyPercentage: number;
}[] {
  return [
    // Different sizes with no dirty rows
    { name: '100 rows (clean)', rows: BOMDataPresets.small(0), dirtyPercentage: 0 },
    { name: '500 rows (clean)', rows: BOMDataPresets.medium(0), dirtyPercentage: 0 },
    { name: '1000 rows (clean)', rows: BOMDataPresets.large(0), dirtyPercentage: 0 },
    { name: '2000 rows (clean)', rows: BOMDataPresets.extraLarge(0), dirtyPercentage: 0 },
    
    // 1000 rows with different dirty percentages
    { name: '1000 rows (1% dirty)', rows: BOMDataPresets.large(1), dirtyPercentage: 1 },
    { name: '1000 rows (10% dirty)', rows: BOMDataPresets.large(10), dirtyPercentage: 10 },
    { name: '1000 rows (50% dirty)', rows: BOMDataPresets.large(50), dirtyPercentage: 50 },
    { name: '1000 rows (100% dirty)', rows: BOMDataPresets.large(100), dirtyPercentage: 100 },
    
    // Nested structure
    { name: '500 rows (nested)', rows: BOMDataPresets.nested(0), dirtyPercentage: 0 },
    { name: '500 rows (nested, 10% dirty)', rows: BOMDataPresets.nested(10), dirtyPercentage: 10 },
  ];
}

/**
 * Calculate expected performance metrics for a dataset
 * Based on performance targets from requirements
 */
export function getExpectedPerformanceMetrics(rowCount: number, dirtyPercentage: number): {
  maxInitialRenderTime: number;
  maxEditTime: number;
  maxCommitTime: number;
  maxActiveProxyCount: number;
} {
  // Scale targets based on row count
  // Base targets are for 1000 rows
  const scaleFactor = rowCount / 1000;
  
  return {
    // Initial render: ≤100ms for 1000 rows (scales linearly)
    // Add 10ms base overhead for test environment setup
    maxInitialRenderTime: Math.max(20, 100 * scaleFactor),
    
    // Single field edit: ≤50ms (constant, doesn't scale with row count)
    maxEditTime: 50,
    
    // Commit: ≤50ms for 1000 rows with 10% dirty (scales with dirty count)
    // Minimum 5ms for clean commits (overhead for checking dirty status)
    maxCommitTime: Math.max(5, 50 * scaleFactor * (dirtyPercentage / 10)),
    
    // Active Proxy count: ≤4,000 for 1000 rows (scales linearly)
    maxActiveProxyCount: 4000 * scaleFactor,
  };
}

/**
 * Create a copy of rows for baseline comparison
 */
export function cloneBOMRows(rows: BOMRowFields[]): BOMRowFields[] {
  return rows.map(row => ({ ...row }));
}

/**
 * Compare two BOM row arrays for equality
 */
export function compareBOMRows(rows1: BOMRowFields[], rows2: BOMRowFields[]): boolean {
  if (rows1.length !== rows2.length) {
    return false;
  }
  
  for (let i = 0; i < rows1.length; i++) {
    const row1 = rows1[i];
    const row2 = rows2[i];
    
    if (row1.id !== row2.id || row1.partNumber !== row2.partNumber) {
      return false;
    }
  }
  
  return true;
}
