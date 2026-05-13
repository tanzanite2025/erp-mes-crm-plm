/**
 * Unit Tests for Error Classes and Handlers
 * 
 * Tests error classes, error recovery handler, retry logic, and state persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BOMDeltaError,
  DiffEngineError,
  ProxyTrackerError,
  VirtualScrollerError,
  ErrorRecoveryHandler,
  createErrorRecoveryHandler,
  isBOMDeltaError,
  isDiffEngineError,
  isProxyTrackerError,
  isVirtualScrollerError,
  formatErrorForUser,
  logError,
  DEFAULT_ERROR_RECOVERY_CONFIG,
} from './errors';

describe('Error Classes', () => {
  describe('BOMDeltaError', () => {
    it('should create error with message and code', () => {
      const error = new BOMDeltaError('Test error', 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('BOMDeltaError');
      expect(error.timestamp).toBeDefined();
    });
    
    it('should include context', () => {
      const context = { rowId: 'row-1', operation: 'commit' };
      const error = new BOMDeltaError('Test error', 'TEST_ERROR', context);
      
      expect(error.context).toEqual(context);
    });
    
    it('should convert to JSON', () => {
      const error = new BOMDeltaError('Test error', 'TEST_ERROR', { key: 'value' });
      const json = error.toJSON();
      
      expect(json.name).toBe('BOMDeltaError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.timestamp).toBeDefined();
      expect(json.context).toEqual({ key: 'value' });
      expect(json.stack).toBeDefined();
    });
  });
  
  describe('DiffEngineError', () => {
    it('should create error with diagnostic information', () => {
      const error = new DiffEngineError('Diff failed', 'DIFF_ERROR', {
        rowCount: 1000,
        rowId: 'row-1',
        fieldName: 'quantity',
      });
      
      expect(error.message).toBe('Diff failed');
      expect(error.code).toBe('DIFF_ERROR');
      expect(error.name).toBe('DiffEngineError');
      expect(error.rowCount).toBe(1000);
      expect(error.rowId).toBe('row-1');
      expect(error.fieldName).toBe('quantity');
    });
  });
  
  describe('ProxyTrackerError', () => {
    it('should create error with operation context', () => {
      const error = new ProxyTrackerError(
        'Proxy creation failed',
        'PROXY_ERROR',
        'create',
        {
          rowId: 'row-1',
          activeProxyCount: 5000,
        }
      );
      
      expect(error.message).toBe('Proxy creation failed');
      expect(error.code).toBe('PROXY_ERROR');
      expect(error.name).toBe('ProxyTrackerError');
      expect(error.operation).toBe('create');
      expect(error.rowId).toBe('row-1');
      expect(error.activeProxyCount).toBe(5000);
    });
  });
  
  describe('VirtualScrollerError', () => {
    it('should create error with scroll context', () => {
      const error = new VirtualScrollerError('Scroll failed', 'SCROLL_ERROR', {
        scrollPosition: 1000,
        visibleRowCount: 20,
      });
      
      expect(error.message).toBe('Scroll failed');
      expect(error.code).toBe('SCROLL_ERROR');
      expect(error.name).toBe('VirtualScrollerError');
      expect(error.scrollPosition).toBe(1000);
      expect(error.visibleRowCount).toBe(20);
    });
  });
});

describe('Error Type Checking', () => {
  it('should identify BOMDeltaError', () => {
    const error = new BOMDeltaError('Test', 'TEST');
    
    expect(isBOMDeltaError(error)).toBe(true);
    expect(isBOMDeltaError(new Error('Test'))).toBe(false);
    expect(isBOMDeltaError('not an error')).toBe(false);
  });
  
  it('should identify DiffEngineError', () => {
    const error = new DiffEngineError('Test', 'TEST');
    
    expect(isDiffEngineError(error)).toBe(true);
    expect(isDiffEngineError(new BOMDeltaError('Test', 'TEST'))).toBe(false);
  });
  
  it('should identify ProxyTrackerError', () => {
    const error = new ProxyTrackerError('Test', 'TEST', 'create');
    
    expect(isProxyTrackerError(error)).toBe(true);
    expect(isProxyTrackerError(new BOMDeltaError('Test', 'TEST'))).toBe(false);
  });
  
  it('should identify VirtualScrollerError', () => {
    const error = new VirtualScrollerError('Test', 'TEST');
    
    expect(isVirtualScrollerError(error)).toBe(true);
    expect(isVirtualScrollerError(new BOMDeltaError('Test', 'TEST'))).toBe(false);
  });
});

describe('Error Formatting', () => {
  it('should format BOMDeltaError for user', () => {
    const error = new BOMDeltaError('Test error', 'TEST');
    const formatted = formatErrorForUser(error);
    
    expect(formatted).toBe('操作失败: Test error');
  });
  
  it('should format generic Error for user', () => {
    const error = new Error('Generic error');
    const formatted = formatErrorForUser(error);
    
    expect(formatted).toBe('发生错误: Generic error');
  });
  
  it('should format unknown error for user', () => {
    const formatted = formatErrorForUser('string error');
    
    expect(formatted).toBe('发生未知错误');
  });
});

describe('Error Logging', () => {
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  
  it('should log BOMDeltaError with diagnostic info', () => {
    const error = new BOMDeltaError('Test error', 'TEST', { key: 'value' });
    
    logError(error);
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BOM Delta Error]',
      expect.objectContaining({
        name: 'BOMDeltaError',
        message: 'Test error',
        code: 'TEST',
      })
    );
  });
  
  it('should log generic Error', () => {
    const error = new Error('Generic error');
    
    logError(error);
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({
        name: 'Error',
        message: 'Generic error',
      })
    );
  });
  
  it('should log unknown error', () => {
    logError('string error');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Unknown Error]',
      expect.objectContaining({
        error: 'string error',
      })
    );
  });
  
  it('should include additional context', () => {
    const error = new Error('Test');
    const context = { operation: 'commit', rowId: 'row-1' };
    
    logError(error, context);
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Error]',
      expect.objectContaining({
        context,
      })
    );
  });
});

describe('ErrorRecoveryHandler', () => {
  let handler: ErrorRecoveryHandler;
  
  beforeEach(() => {
    handler = new ErrorRecoveryHandler();
  });
  
  describe('State Persistence', () => {
    it('should save and restore state', () => {
      const state = { data: 'test', count: 42 };
      
      handler.saveState('test-key', state);
      const restored = handler.restoreState('test-key');
      
      expect(restored).toEqual(state);
    });
    
    it('should return undefined for non-existent key', () => {
      const restored = handler.restoreState('non-existent');
      
      expect(restored).toBeUndefined();
    });
    
    it('should clear specific state', () => {
      handler.saveState('key1', 'value1');
      handler.saveState('key2', 'value2');
      
      handler.clearState('key1');
      
      expect(handler.restoreState('key1')).toBeUndefined();
      expect(handler.restoreState('key2')).toBe('value2');
    });
    
    it('should clear all states', () => {
      handler.saveState('key1', 'value1');
      handler.saveState('key2', 'value2');
      
      handler.clearAllStates();
      
      expect(handler.restoreState('key1')).toBeUndefined();
      expect(handler.restoreState('key2')).toBeUndefined();
    });
    
    it('should not save state when disabled', () => {
      handler = new ErrorRecoveryHandler({ enableStatePersistence: false });
      
      handler.saveState('test-key', 'test-value');
      const restored = handler.restoreState('test-key');
      
      expect(restored).toBeUndefined();
    });
  });
  
  describe('Retry Logic', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await handler.withRetry(operation, 'test-operation');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry on failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValue('success');
      
      const result = await handler.withRetry(operation, 'test-operation');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
    
    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(
        handler.withRetry(operation, 'test-operation')
      ).rejects.toThrow('RETRY_EXHAUSTED');
      
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
    
    it('should use exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await handler.withRetry(operation, 'test-operation');
      const duration = Date.now() - startTime;
      
      // Should wait at least 100ms + 200ms = 300ms
      expect(duration).toBeGreaterThanOrEqual(300);
    });
    
    it('should not retry when disabled', async () => {
      handler = new ErrorRecoveryHandler({ enableRetry: false });
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      
      await expect(
        handler.withRetry(operation, 'test-operation')
      ).rejects.toThrow('Failed');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Graceful Degradation', () => {
    it('should use operation result when successful', async () => {
      const operation = vi.fn().mockResolvedValue('operation-result');
      const fallback = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await handler.withGracefulDegradation(
        operation,
        fallback,
        'test-operation'
      );
      
      expect(result).toBe('operation-result');
      expect(operation).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
    });
    
    it('should use fallback when operation fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const fallback = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await handler.withGracefulDegradation(
        operation,
        fallback,
        'test-operation'
      );
      
      expect(result).toBe('fallback-result');
      expect(operation).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });
    
    it('should not use fallback when disabled', async () => {
      handler = new ErrorRecoveryHandler({ enableGracefulDegradation: false });
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const fallback = vi.fn().mockResolvedValue('fallback-result');
      
      await expect(
        handler.withGracefulDegradation(operation, fallback, 'test-operation')
      ).rejects.toThrow('Failed');
      
      expect(fallback).not.toHaveBeenCalled();
    });
  });
  
  describe('Full Recovery', () => {
    it('should combine all recovery strategies', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockResolvedValue('success');
      const fallback = vi.fn().mockResolvedValue('fallback');
      const state = { data: 'test' };
      
      const result = await handler.withFullRecovery(
        operation,
        fallback,
        'test-operation',
        'test-key',
        state
      );
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Retry once
      expect(fallback).not.toHaveBeenCalled();
    });
    
    it('should restore state and use fallback on failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const fallback = vi.fn().mockResolvedValue('fallback');
      const state = { data: 'test' };
      
      const result = await handler.withFullRecovery(
        operation,
        fallback,
        'test-operation',
        'test-key',
        state
      );
      
      expect(result).toBe('fallback');
      expect(handler.restoreState('test-key')).toEqual(state);
    });
    
    it('should clear state on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const fallback = vi.fn().mockResolvedValue('fallback');
      const state = { data: 'test' };
      
      await handler.withFullRecovery(
        operation,
        fallback,
        'test-operation',
        'test-key',
        state
      );
      
      expect(handler.restoreState('test-key')).toBeUndefined();
    });
  });
  
  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = handler.getConfig();
      
      expect(config).toEqual(DEFAULT_ERROR_RECOVERY_CONFIG);
    });
    
    it('should use custom configuration', () => {
      handler = new ErrorRecoveryHandler({
        maxRetries: 5,
        initialRetryDelay: 200,
      });
      
      const config = handler.getConfig();
      
      expect(config.maxRetries).toBe(5);
      expect(config.initialRetryDelay).toBe(200);
    });
    
    it('should update configuration', () => {
      handler.updateConfig({ maxRetries: 10 });
      
      const config = handler.getConfig();
      
      expect(config.maxRetries).toBe(10);
    });
  });
});

describe('Factory Function', () => {
  it('should create handler with default config', () => {
    const handler = createErrorRecoveryHandler();
    
    expect(handler).toBeInstanceOf(ErrorRecoveryHandler);
    expect(handler.getConfig()).toEqual(DEFAULT_ERROR_RECOVERY_CONFIG);
  });
  
  it('should create handler with custom config', () => {
    const handler = createErrorRecoveryHandler({ maxRetries: 5 });
    
    expect(handler.getConfig().maxRetries).toBe(5);
  });
});
