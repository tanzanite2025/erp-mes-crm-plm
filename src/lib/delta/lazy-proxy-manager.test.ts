/**
 * Unit Tests for BOMProxyManager
 * 
 * Tests Proxy creation, caching, release logic, and dirty row preservation.
 * 
 * Target: ≥90% code coverage
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { BOMProxyManager } from './lazy-proxy-manager';
import { BOMDirtyMarker } from './dirty-marker';

/**
 * Test BOM row interface
 */
interface TestBOMRow {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

describe('BOMProxyManager', () => {
  let dirtyMarker: BOMDirtyMarker;
  let proxyManager: BOMProxyManager<TestBOMRow>;
  
  beforeEach(() => {
    dirtyMarker = new BOMDirtyMarker();
    proxyManager = new BOMProxyManager<TestBOMRow>(
      dirtyMarker,
      (row) => row.id
    );
  });
  
  describe('Proxy Creation and Caching', () => {
    it('should create Proxy for a row', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      const proxy = proxyManager.getProxy(row.id, row);
      
      expect(proxy).toBeDefined();
      expect(proxy.id).toBe('row-1');
      expect(proxy.name).toBe('Test Item');
    });
    
    it('should cache Proxy after creation', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      const proxy1 = proxyManager.getProxy(row.id, row);
      const proxy2 = proxyManager.getProxy(row.id, row);
      
      // Should return the same Proxy instance
      expect(proxy1).toBe(proxy2);
      expect(proxyManager.hasProxy(row.id)).toBe(true);
    });
    
    it('should create separate Proxies for different rows', () => {
      const row1: TestBOMRow = {
        id: 'row-1',
        name: 'Item 1',
        quantity: 10,
        price: 100,
      };
      
      const row2: TestBOMRow = {
        id: 'row-2',
        name: 'Item 2',
        quantity: 20,
        price: 200,
      };
      
      const proxy1 = proxyManager.getProxy(row1.id, row1);
      const proxy2 = proxyManager.getProxy(row2.id, row2);
      
      expect(proxy1).not.toBe(proxy2);
      expect(proxy1.id).toBe('row-1');
      expect(proxy2.id).toBe('row-2');
      expect(proxyManager.getActiveProxyCount()).toBe(2);
    });
    
    it('should track active Proxy count', () => {
      expect(proxyManager.getActiveProxyCount()).toBe(0);
      
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      
      proxyManager.getProxy(row1.id, row1);
      expect(proxyManager.getActiveProxyCount()).toBe(1);
      
      proxyManager.getProxy(row2.id, row2);
      expect(proxyManager.getActiveProxyCount()).toBe(2);
      
      proxyManager.getProxy(row3.id, row3);
      expect(proxyManager.getActiveProxyCount()).toBe(3);
    });
  });
  
  describe('Proxy Release for Clean Rows', () => {
    it('should release Proxy for clean row', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      proxyManager.getProxy(row.id, row);
      expect(proxyManager.hasProxy(row.id)).toBe(true);
      
      proxyManager.releaseProxy(row.id);
      expect(proxyManager.hasProxy(row.id)).toBe(false);
      expect(proxyManager.getActiveProxyCount()).toBe(0);
    });
    
    it('should not release Proxy for dirty row', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      const proxy = proxyManager.getProxy(row.id, row);
      
      // Modify the row to mark it as dirty
      proxy.quantity = 20;
      
      // Verify row is marked as dirty
      expect(dirtyMarker.isDirty(row.id)).toBe(true);
      
      // Try to release Proxy
      proxyManager.releaseProxy(row.id);
      
      // Proxy should still exist because row is dirty
      expect(proxyManager.hasProxy(row.id)).toBe(true);
      expect(proxyManager.getActiveProxyCount()).toBe(1);
    });
    
    it('should release multiple clean Proxies', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      
      proxyManager.getProxy(row1.id, row1);
      proxyManager.getProxy(row2.id, row2);
      proxyManager.getProxy(row3.id, row3);
      
      expect(proxyManager.getActiveProxyCount()).toBe(3);
      
      proxyManager.releaseProxy(row1.id);
      proxyManager.releaseProxy(row2.id);
      
      expect(proxyManager.getActiveProxyCount()).toBe(1);
      expect(proxyManager.hasProxy(row1.id)).toBe(false);
      expect(proxyManager.hasProxy(row2.id)).toBe(false);
      expect(proxyManager.hasProxy(row3.id)).toBe(true);
    });
  });
  
  describe('Proxy Preservation for Dirty Rows', () => {
    it('should preserve Proxy for dirty row', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      const proxy = proxyManager.getProxy(row.id, row);
      
      // Modify the row
      proxy.quantity = 20;
      
      // Verify row is dirty
      expect(dirtyMarker.isDirty(row.id)).toBe(true);
      
      // Proxy should be preserved
      expect(proxyManager.hasProxy(row.id)).toBe(true);
      
      // Try to release - should not release
      proxyManager.releaseProxy(row.id);
      expect(proxyManager.hasProxy(row.id)).toBe(true);
    });
    
    it('should preserve multiple dirty Proxies', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      
      const proxy1 = proxyManager.getProxy(row1.id, row1);
      const proxy2 = proxyManager.getProxy(row2.id, row2);
      const proxy3 = proxyManager.getProxy(row3.id, row3);
      
      // Modify row1 and row3
      proxy1.quantity = 15;
      proxy3.quantity = 35;
      
      // Try to release all
      proxyManager.releaseProxy(row1.id);
      proxyManager.releaseProxy(row2.id);
      proxyManager.releaseProxy(row3.id);
      
      // Only row2 should be released (clean)
      expect(proxyManager.hasProxy(row1.id)).toBe(true);
      expect(proxyManager.hasProxy(row2.id)).toBe(false);
      expect(proxyManager.hasProxy(row3.id)).toBe(true);
      expect(proxyManager.getActiveProxyCount()).toBe(2);
    });
  });
  
  describe('Bulk Proxy Release', () => {
    it('should release all clean Proxies', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      const row4: TestBOMRow = { id: 'row-4', name: 'Item 4', quantity: 40, price: 400 };
      
      const proxy1 = proxyManager.getProxy(row1.id, row1);
      proxyManager.getProxy(row2.id, row2);
      const proxy3 = proxyManager.getProxy(row3.id, row3);
      proxyManager.getProxy(row4.id, row4);
      
      // Modify row1 and row3 to make them dirty
      proxy1.quantity = 15;
      proxy3.quantity = 35;
      
      expect(proxyManager.getActiveProxyCount()).toBe(4);
      
      // Release all clean Proxies
      proxyManager.releaseCleanProxies();
      
      // Only dirty Proxies should remain
      expect(proxyManager.getActiveProxyCount()).toBe(2);
      expect(proxyManager.hasProxy(row1.id)).toBe(true);
      expect(proxyManager.hasProxy(row2.id)).toBe(false);
      expect(proxyManager.hasProxy(row3.id)).toBe(true);
      expect(proxyManager.hasProxy(row4.id)).toBe(false);
    });
    
    it('should release all Proxies when all are clean', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      
      proxyManager.getProxy(row1.id, row1);
      proxyManager.getProxy(row2.id, row2);
      proxyManager.getProxy(row3.id, row3);
      
      expect(proxyManager.getActiveProxyCount()).toBe(3);
      
      proxyManager.releaseCleanProxies();
      
      expect(proxyManager.getActiveProxyCount()).toBe(0);
    });
    
    it('should preserve all Proxies when all are dirty', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      
      const proxy1 = proxyManager.getProxy(row1.id, row1);
      const proxy2 = proxyManager.getProxy(row2.id, row2);
      const proxy3 = proxyManager.getProxy(row3.id, row3);
      
      // Modify all rows
      proxy1.quantity = 15;
      proxy2.quantity = 25;
      proxy3.quantity = 35;
      
      expect(proxyManager.getActiveProxyCount()).toBe(3);
      
      proxyManager.releaseCleanProxies();
      
      // All Proxies should be preserved
      expect(proxyManager.getActiveProxyCount()).toBe(3);
    });
  });
  
  describe('Utility Methods', () => {
    it('should check if Proxy exists', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      expect(proxyManager.hasProxy(row.id)).toBe(false);
      
      proxyManager.getProxy(row.id, row);
      
      expect(proxyManager.hasProxy(row.id)).toBe(true);
    });
    
    it('should get cached row IDs', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      const row3: TestBOMRow = { id: 'row-3', name: 'Item 3', quantity: 30, price: 300 };
      
      proxyManager.getProxy(row1.id, row1);
      proxyManager.getProxy(row2.id, row2);
      proxyManager.getProxy(row3.id, row3);
      
      const cachedIds = proxyManager.getCachedRowIds();
      
      expect(cachedIds).toHaveLength(3);
      expect(cachedIds).toContain('row-1');
      expect(cachedIds).toContain('row-2');
      expect(cachedIds).toContain('row-3');
    });
    
    it('should clear all Proxies', () => {
      const row1: TestBOMRow = { id: 'row-1', name: 'Item 1', quantity: 10, price: 100 };
      const row2: TestBOMRow = { id: 'row-2', name: 'Item 2', quantity: 20, price: 200 };
      
      const proxy1 = proxyManager.getProxy(row1.id, row1);
      proxyManager.getProxy(row2.id, row2);
      
      // Make row1 dirty
      proxy1.quantity = 15;
      
      expect(proxyManager.getActiveProxyCount()).toBe(2);
      
      // Clear all (including dirty)
      proxyManager.clearAll();
      
      expect(proxyManager.getActiveProxyCount()).toBe(0);
      expect(proxyManager.hasProxy(row1.id)).toBe(false);
      expect(proxyManager.hasProxy(row2.id)).toBe(false);
    });
    
    it('should get Proxy tracker', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      proxyManager.getProxy(row.id, row);
      
      const tracker = proxyManager.getTracker(row.id);
      
      expect(tracker).toBeDefined();
      expect(tracker?.id).toBe('row-1');
    });
    
    it('should return undefined for non-existent tracker', () => {
      const tracker = proxyManager.getTracker('non-existent');
      
      expect(tracker).toBeUndefined();
    });
  });
  
  describe('Mutation Callback', () => {
    it('should call mutation callback when row is modified', () => {
      let mutationCount = 0;
      
      const proxyManagerWithCallback = new BOMProxyManager<TestBOMRow>(
        dirtyMarker,
        (row) => row.id,
        () => {
          mutationCount++;
        }
      );
      
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      const proxy = proxyManagerWithCallback.getProxy(row.id, row);
      
      expect(mutationCount).toBe(0);
      
      // Modify the row
      proxy.quantity = 20;
      
      expect(mutationCount).toBe(1);
      
      // Modify again
      proxy.price = 200;
      
      expect(mutationCount).toBe(2);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty Proxy cache', () => {
      expect(proxyManager.getActiveProxyCount()).toBe(0);
      expect(proxyManager.getCachedRowIds()).toHaveLength(0);
      
      proxyManager.releaseCleanProxies();
      
      expect(proxyManager.getActiveProxyCount()).toBe(0);
    });
    
    it('should handle releasing non-existent Proxy', () => {
      proxyManager.releaseProxy('non-existent');
      
      expect(proxyManager.getActiveProxyCount()).toBe(0);
    });
    
    it('should handle multiple modifications to same field', () => {
      const row: TestBOMRow = {
        id: 'row-1',
        name: 'Test Item',
        quantity: 10,
        price: 100,
      };
      
      const proxy = proxyManager.getProxy(row.id, row);
      
      proxy.quantity = 20;
      proxy.quantity = 30;
      proxy.quantity = 40;
      
      expect(dirtyMarker.isDirty(row.id)).toBe(true);
      expect(proxy.quantity).toBe(40);
    });
  });
});
