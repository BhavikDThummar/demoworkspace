// Test import to verify library compilation and exports
import {
  GoRulesModule,
  GoRulesService,
  GoRulesConfigService,
  GoRulesLoggerService,
  GoRulesMetricsService,
  GoRulesMonitoringService,
  GoRulesConfig,
  RuleExecutionOptions,
  RuleExecutionResult,
  GoRulesException,
  GoRulesErrorCode,
} from './libs/gorules/dist/src/index.js';

// Test that types are properly exported
const config: GoRulesConfig = {
  apiUrl: 'https://test.gorules.io',
  apiKey: 'test-key',
  projectId: 'test-project',
  timeout: 30000,
  retryAttempts: 3,
  enableLogging: true,
};

const options: RuleExecutionOptions = {
  timeout: 5000,
  trace: true,
};

console.log('Library imports successfully!');
console.log('GoRulesModule:', typeof GoRulesModule);
console.log('GoRulesService:', typeof GoRulesService);
console.log('Config:', config);
console.log('Options:', options);