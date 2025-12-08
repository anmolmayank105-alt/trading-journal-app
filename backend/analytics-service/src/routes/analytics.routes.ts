/**
 * Analytics Routes
 */

import { Router } from 'express';
import { analyticsController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Dashboard
router.get('/dashboard', analyticsController.getDashboard.bind(analyticsController) as any);

// Performance metrics
router.get('/metrics', analyticsController.getPerformanceMetrics.bind(analyticsController) as any);

// P&L breakdown
router.get('/breakdown/:dimension', analyticsController.getPnLBreakdown.bind(analyticsController) as any);

// Trends
router.get('/trends/monthly', analyticsController.getMonthlyTrend.bind(analyticsController) as any);
router.get('/trends/weekly', analyticsController.getWeeklyTrend.bind(analyticsController) as any);

// Reports
router.post('/reports', analyticsController.generateReport.bind(analyticsController) as any);
router.get('/reports/monthly/:year/:month', analyticsController.getMonthlyReport.bind(analyticsController) as any);
router.get('/reports/yearly/:year', analyticsController.getYearlyReport.bind(analyticsController) as any);
router.post('/reports/compare', analyticsController.comparePeriods.bind(analyticsController) as any);

// Export
router.get('/export/csv', analyticsController.exportCSV.bind(analyticsController) as any);

export default router;
