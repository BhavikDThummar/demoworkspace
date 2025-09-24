import { Inject } from '@nestjs/common';
import { GORULES_CONFIG_TOKEN } from '../gorules.module.js';

/**
 * Decorator to inject GoRules configuration
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesConfig = () => Inject(GORULES_CONFIG_TOKEN);

/**
 * Decorator to inject GoRules service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesService = () => Inject('GoRulesService');

/**
 * Decorator to inject GoRules HTTP service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesHttpService = () => Inject('GoRulesHttpService');

/**
 * Decorator to inject GoRules Zen service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesZenService = () => Inject('GoRulesZenService');

/**
 * Decorator to inject GoRules Resilience service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesResilienceService = () => Inject('GoRulesResilienceService');

/**
 * Decorator to inject GoRules Logger service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesLogger = () => Inject('GoRulesLoggerService');

/**
 * Decorator to inject GoRules Metrics service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesMetrics = () => Inject('GoRulesMetricsService');

/**
 * Decorator to inject GoRules Monitoring service
 * @returns Parameter decorator for dependency injection
 */
export const InjectGoRulesMonitoring = () => Inject('GoRulesMonitoringService');
