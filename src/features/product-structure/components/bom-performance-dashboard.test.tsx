/**
 * Unit Tests for BOMPerformanceDashboard Component
 * 
 * Tests metric display, export functionality, and threshold indicators.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BOMPerformanceDashboard, BOMPerformanceDashboardCompact } from './bom-performance-dashboard';
import { BOMPerformanceMonitor } from '@/lib/performance/bom-performance-monitor';

describe('BOMPerformanceDashboard Component', () => {
  let monitor: BOMPerformanceMonitor;
  
  beforeEach(() => {
    monitor = new BOMPerformanceMonitor();
  });
  
  afterEach(() => {
    cleanup();
  });
  
  describe('Rendering', () => {
    it('should render with no metrics', () => {
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('性能监控')).toBeDefined();
      expect(screen.getByText('暂无性能数据')).toBeDefined();
    });
    
    it('should render with metrics', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('性能监控')).toBeDefined();
      expect(screen.getByText('初始渲染时间')).toBeDefined();
      expect(screen.getByText('编辑操作时间')).toBeDefined();
      expect(screen.getByText('提交操作时间')).toBeDefined();
      expect(screen.getByText('活跃 Proxy 数量')).toBeDefined();
    });
    
    it('should display metric values correctly', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('80.0ms')).toBeDefined();
      expect(screen.getByText('30.0ms')).toBeDefined();
      expect(screen.getByText('40.0ms')).toBeDefined();
      expect(screen.getByText('3,000')).toBeDefined();
    });
    
    it('should display dirty row count', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('脏行数')).toBeDefined();
      expect(screen.getByText('100')).toBeDefined();
    });
    
    it('should display total row count', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('总行数')).toBeDefined();
      expect(screen.getByText('1,000')).toBeDefined();
    });
    
    it('should apply custom className', () => {
      render(<BOMPerformanceDashboard monitor={monitor} className="custom-class" />);
      
      const card = screen.getByText('性能监控').closest('.custom-class');
      expect(card).toBeDefined();
    });
  });
  
  describe('Threshold Indicators', () => {
    it('should show excellent status for metrics well below threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 40, // 40% of 100ms threshold
        editTime: 20, // 40% of 50ms threshold
        commitTime: 20, // 40% of 50ms threshold
        activeProxyCount: 1500, // 37.5% of 4000 threshold
        dirtyRowCount: 50,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      const excellentBadges = screen.getAllByText('优秀');
      expect(excellentBadges.length).toBeGreaterThan(0);
    });
    
    it('should show good status for metrics at 60-80% of threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 70, // 70% of 100ms threshold
        editTime: 35, // 70% of 50ms threshold
        commitTime: 35, // 70% of 50ms threshold
        activeProxyCount: 2800, // 70% of 4000 threshold
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      const goodBadges = screen.getAllByText('良好');
      expect(goodBadges.length).toBeGreaterThan(0);
    });
    
    it('should show warning status for metrics at 80-100% of threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 90, // 90% of 100ms threshold
        editTime: 45, // 90% of 50ms threshold
        commitTime: 45, // 90% of 50ms threshold
        activeProxyCount: 3600, // 90% of 4000 threshold
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      const warningBadges = screen.getAllByText('警告');
      expect(warningBadges.length).toBeGreaterThan(0);
    });
    
    it('should show critical status for metrics exceeding threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 120, // 120% of 100ms threshold
        editTime: 60, // 120% of 50ms threshold
        commitTime: 60, // 120% of 50ms threshold
        activeProxyCount: 5000, // 125% of 4000 threshold
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      const criticalBadges = screen.getAllByText('严重');
      expect(criticalBadges.length).toBeGreaterThan(0);
    });
    
    it('should show overall status as 达标 when all metrics meet thresholds', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('达标')).toBeDefined();
    });
    
    it('should show overall status as 超标 when any metric exceeds threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 120, // Exceeds threshold
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('超标')).toBeDefined();
    });
  });
  
  describe('Export Functionality', () => {
    it('should render export button by default', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('导出数据')).toBeDefined();
    });
    
    it('should hide export button when showExport is false', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} showExport={false} />);
      
      expect(screen.queryByText('导出数据')).toBeNull();
    });
    
    it('should trigger download when export button is clicked', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      // Mock document.createElement and related methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      const exportButton = screen.getByText('导出数据');
      fireEvent.click(exportButton);
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toContain('bom-performance-metrics-');
      expect(mockLink.download).toContain('.json');
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
  
  describe('Average Metrics', () => {
    it('should not show average metrics with only one recording', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.queryByText('平均性能指标')).toBeNull();
    });
    
    it('should show average metrics with multiple recordings', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      monitor.recordMetrics({
        initialRenderTime: 100,
        editTime: 50,
        commitTime: 60,
        activeProxyCount: 4000,
        dirtyRowCount: 200,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('平均性能指标')).toBeDefined();
    });
    
    it('should display correct average values', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      monitor.recordMetrics({
        initialRenderTime: 100,
        editTime: 50,
        commitTime: 60,
        activeProxyCount: 4000,
        dirtyRowCount: 200,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      // Average of 80 and 100 is 90
      expect(screen.getByText('90.0ms')).toBeDefined();
      // Average of 30 and 50 is 40
      expect(screen.getByText('40.0ms')).toBeDefined();
      // Average of 40 and 60 is 50
      expect(screen.getByText('50.0ms')).toBeDefined();
      // Average of 3000 and 4000 is 3500
      expect(screen.getByText('3,500')).toBeDefined();
    });
  });
  
  describe('Details Display', () => {
    it('should show details by default', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('初始渲染时间')).toBeDefined();
      expect(screen.getByText('编辑操作时间')).toBeDefined();
    });
    
    it('should hide details when showDetails is false', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} showDetails={false} />);
      
      expect(screen.queryByText('初始渲染时间')).toBeNull();
      expect(screen.queryByText('编辑操作时间')).toBeNull();
    });
  });
  
  describe('Recording Count', () => {
    it('should display correct recording count', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText(/1 次记录/)).toBeDefined();
    });
    
    it('should update recording count with multiple recordings', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      monitor.recordMetrics({
        initialRenderTime: 90,
        editTime: 35,
        commitTime: 45,
        activeProxyCount: 3500,
        dirtyRowCount: 150,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText(/2 次记录/)).toBeDefined();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      monitor.recordMetrics({
        initialRenderTime: 0,
        editTime: 0,
        commitTime: 0,
        activeProxyCount: 0,
        dirtyRowCount: 0,
        totalRowCount: 0,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('<1ms')).toBeDefined();
      expect(screen.getByText('0')).toBeDefined();
    });
    
    it('should handle very large values', () => {
      monitor.recordMetrics({
        initialRenderTime: 10000,
        editTime: 5000,
        commitTime: 8000,
        activeProxyCount: 100000,
        dirtyRowCount: 50000,
        totalRowCount: 100000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('10000.0ms')).toBeDefined();
      expect(screen.getByText('100,000')).toBeDefined();
    });
    
    it('should handle fractional milliseconds', () => {
      monitor.recordMetrics({
        initialRenderTime: 0.5,
        editTime: 0.3,
        commitTime: 0.7,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboard monitor={monitor} />);
      
      expect(screen.getByText('<1ms')).toBeDefined();
    });
  });
});

describe('BOMPerformanceDashboardCompact Component', () => {
  let monitor: BOMPerformanceMonitor;
  
  beforeEach(() => {
    monitor = new BOMPerformanceMonitor();
  });
  
  afterEach(() => {
    cleanup();
  });
  
  describe('Rendering', () => {
    it('should render nothing with no metrics', () => {
      const { container } = render(<BOMPerformanceDashboardCompact monitor={monitor} />);
      
      expect(container.firstChild).toBeNull();
    });
    
    it('should render compact metrics', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboardCompact monitor={monitor} />);
      
      expect(screen.getByText('达标')).toBeDefined();
      expect(screen.getByText('80.0ms')).toBeDefined();
      expect(screen.getByText('30.0ms')).toBeDefined();
      expect(screen.getByText('40.0ms')).toBeDefined();
      expect(screen.getByText('3,000')).toBeDefined();
    });
    
    it('should show 超标 status when metrics exceed threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 120,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      render(<BOMPerformanceDashboardCompact monitor={monitor} />);
      
      expect(screen.getByText('超标')).toBeDefined();
    });
    
    it('should apply custom className', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const { container } = render(
        <BOMPerformanceDashboardCompact monitor={monitor} className="custom-compact" />
      );
      
      expect(container.firstChild?.className).toContain('custom-compact');
    });
  });
});
