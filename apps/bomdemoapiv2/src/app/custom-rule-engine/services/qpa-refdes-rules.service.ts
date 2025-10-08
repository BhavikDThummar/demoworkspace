/**
 * Service for QPA RefDes Rules - Dynamic Rule Engine
 */

import { Injectable, Logger } from '@nestjs/common';
import { dynamicQpaRefDesRules } from '../rules/dynamicQpaRefDesRules';

@Injectable()
export class QpaRefDesRulesService {
  private readonly logger = new Logger(QpaRefDesRulesService.name);

  /**
   * Get dynamic rules with function code as strings
   */
  async getDynamicRules(): Promise<{ success: boolean; rules: unknown[]; message?: string; error?: string }> {
    try {
      this.logger.log('Fetching dynamic QPA RefDes validation rules');

      // Return the clean dynamic rules (no function serialization needed)
      return {
        success: true,
        rules: dynamicQpaRefDesRules,
        message: `${dynamicQpaRefDesRules.length} dynamic QPA RefDes validation rules retrieved successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dynamic QPA RefDes rules: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return {
        success: false,
        rules: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Failed to retrieve dynamic QPA RefDes validation rules',
      };
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    rulesAvailable: boolean;
    message: string;
  }> {
    try {
      const rulesCount = dynamicQpaRefDesRules.length;
      const enabledCount = dynamicQpaRefDesRules.filter(rule => rule.enabled).length;

      return {
        status: 'ok',
        rulesAvailable: rulesCount > 0,
        message: `Dynamic Rule Engine is healthy. ${rulesCount} total rules, ${enabledCount} enabled.`,
      };
    } catch (error) {
      return {
        status: 'error',
        rulesAvailable: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}