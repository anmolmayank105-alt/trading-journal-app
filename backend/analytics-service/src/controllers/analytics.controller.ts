/**
 * Analytics Controller
 * Handles analytics and dashboard endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '@stock-tracker/shared/types';
import { dashboardService, pnlService, reportService } from '../services';
import { logger } from '@stock-tracker/shared/utils';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const breakdownDimensionSchema = z.enum(['segment', 'tradeType', 'position', 'dayOfWeek', 'timeOfDay']);

class AnalyticsController {
  /**
   * Get dashboard summary
   */
  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const summary = await dashboardService.getDashboardSummary(userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting dashboard');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get dashboard data',
        },
      });
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const metrics = await dashboardService.getPerformanceMetrics(userId, start, end);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Invalid date format',
            details: error.errors,
          },
        });
        return;
      }

      logger.error({ error: error.message }, 'Error getting performance metrics');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get performance metrics',
        },
      });
    }
  }

  /**
   * Get P&L breakdown by dimension
   */
  async getPnLBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const dimension = breakdownDimensionSchema.parse(req.params.dimension);
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const breakdown = await dashboardService.getPnLBreakdown(userId, dimension, start, end);

      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Invalid parameters',
            details: error.errors,
          },
        });
        return;
      }

      logger.error({ error: error.message }, 'Error getting P&L breakdown');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get P&L breakdown',
        },
      });
    }
  }

  /**
   * Get monthly trend
   */
  async getMonthlyTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const months = parseInt(req.query.months as string) || 12;

      const trend = await dashboardService.getMonthlyTrend(userId, months);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting monthly trend');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get monthly trend',
        },
      });
    }
  }

  /**
   * Get weekly trend
   */
  async getWeeklyTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const weeks = parseInt(req.query.weeks as string) || 12;

      const trend = await dashboardService.getWeeklyTrend(userId, weeks);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting weekly trend');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get weekly trend',
        },
      });
    }
  }

  /**
   * Generate trading report
   */
  async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate, type } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Start date and end date are required',
          },
        });
        return;
      }

      const report = await reportService.generateReport(
        userId,
        new Date(startDate),
        new Date(endDate),
        type || 'custom'
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error generating report');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to generate report',
        },
      });
    }
  }

  /**
   * Get monthly report
   */
  async getMonthlyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Invalid year or month',
          },
        });
        return;
      }

      const report = await reportService.generateMonthlyReport(userId, year, month);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting monthly report');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get monthly report',
        },
      });
    }
  }

  /**
   * Get yearly report
   */
  async getYearlyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const year = parseInt(req.params.year);

      if (isNaN(year)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Invalid year',
          },
        });
        return;
      }

      const report = await reportService.generateYearlyReport(userId, year);

      res.json({
        success: true,
        data: report,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error getting yearly report');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to get yearly report',
        },
      });
    }
  }

  /**
   * Export data as CSV
   */
  async exportCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'Start date and end date are required',
          },
        });
        return;
      }

      const csv = await reportService.exportToCSV(
        userId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=trading-report-${startDate}-${endDate}.csv`);
      res.send(csv);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error exporting CSV');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to export CSV',
        },
      });
    }
  }

  /**
   * Compare two periods
   */
  async comparePeriods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { period1Start, period1End, period2Start, period2End } = req.body;

      if (!period1Start || !period1End || !period2Start || !period2End) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VAL_001',
            message: 'All period dates are required',
          },
        });
        return;
      }

      const comparison = await reportService.getPeriodsComparison(
        userId,
        new Date(period1Start),
        new Date(period1End),
        new Date(period2Start),
        new Date(period2End)
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error comparing periods');
      res.status(500).json({
        success: false,
        error: {
          code: 'SRV_001',
          message: 'Failed to compare periods',
        },
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
