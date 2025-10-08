/**
 * Controller for QPA RefDes Rules - Dynamic Rule Engine
 */

import { Controller, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { QpaRefDesRulesService } from '../services/qpa-refdes-rules.service';

@Controller('custom-rules/qpa-refdes')
export class QpaRefDesRulesController {
  private readonly logger = new Logger(QpaRefDesRulesController.name);

  constructor(private readonly qpaRefDesRulesService: QpaRefDesRulesService) {}

  /**
   * Get dynamic rules with function code as strings
   */
  @Get('dynamic-rules')
  async getDynamicRules() {
    try {
      this.logger.log('Received request for dynamic QPA RefDes validation rules');

      const result = await this.qpaRefDesRulesService.getDynamicRules();

      if (!result.success) {
        throw new HttpException(
          result.error || 'Failed to retrieve dynamic rules',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(`Successfully returned ${result.rules.length} dynamic QPA RefDes rules`);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get dynamic QPA RefDes rules: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to retrieve dynamic QPA RefDes rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  async getHealth() {
    try {
      const healthStatus = await this.qpaRefDesRulesService.healthCheck();

      return {
        service: 'QPA RefDes Dynamic Rules Service',
        ...healthStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}