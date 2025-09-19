import { Module } from '@nestjs/common';
import { GoRulesLoggerService } from '../logging/gorules-logger.service.js';
import { GoRulesMetricsService } from './gorules-metrics.service.js';
import { GoRulesMonitoringService } from './gorules-monitoring.service.js';

/**
 * Module for GoRules monitoring and logging services
 */
@Module({
  providers: [GoRulesLoggerService, GoRulesMetricsService, GoRulesMonitoringService],
  exports: [GoRulesLoggerService, GoRulesMetricsService, GoRulesMonitoringService],
})
export class GoRulesMonitoringModule {}
