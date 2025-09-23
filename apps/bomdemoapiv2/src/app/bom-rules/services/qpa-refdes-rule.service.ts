/**
 * Service for QPA vs RefDes rule execution using local rule loader
 */

import { Injectable, Logger } from '@nestjs/common';
import { MinimalGoRulesService } from '@org/minimal-gorules';
import type {
  IBOMValidationRequest,
  IBOMValidationResponse,
} from '../interfaces/bom-item.interface';

@Injectable()
export class QpaRefDesRuleService {
  private readonly logger = new Logger(QpaRefDesRuleService.name);
  private readonly ruleId = 'QPA vs RefDes'; // Rule file name without .json extension

  constructor(private readonly minimalGoRulesService: MinimalGoRulesService) {}

  /**
   * Execute the QPA vs RefDes rule with BOM item data
   */
  async executeQpaRefDesRule(
    request: IBOMValidationRequest,
  ): Promise<IBOMValidationResponse> {
    try {
      this.logger.log(`Executing QPA vs RefDes rule for BOM item: ${request.bomItem.lineID}`);

      const startTime = performance.now();

      // Execute the rule using the minimal GoRules service
      const result = await this.minimalGoRulesService.executeRule<IBOMValidationResponse>(
        this.ruleId,
        request,
      );

      const executionTime = performance.now() - startTime;

      this.logger.log(
        `QPA vs RefDes rule executed successfully in ${executionTime.toFixed(2)}ms`,
      );

      return {
        success: true,
        validationFlags: result.validationFlags || {},
        otherValidation: result.otherValidation || {},
        executionTime,
        message: 'QPA vs RefDes validation completed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute QPA vs RefDes rule: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        validationFlags: {},
        otherValidation: {},
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'QPA vs RefDes validation failed',
      };
    }
  }

  /**
   * Validate the QPA vs RefDes rule is available and executable
   */
  async validateRule(): Promise<boolean> {
    try {
      return await this.minimalGoRulesService.validateRule(this.ruleId);
    } catch (error) {
      this.logger.error(`Failed to validate QPA vs RefDes rule: ${error}`);
      return false;
    }
  }

  /**
   * Get metadata for the QPA vs RefDes rule
   */
  async getRuleMetadata() {
    try {
      return await this.minimalGoRulesService.getRuleMetadata(this.ruleId);
    } catch (error) {
      this.logger.error(`Failed to get QPA vs RefDes rule metadata: ${error}`);
      return null;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    ruleAvailable: boolean;
    message: string;
  }> {
    try {
      const isRuleValid = await this.validateRule();
      const metadata = await this.getRuleMetadata();

      return {
        status: isRuleValid ? 'ok' : 'error',
        ruleAvailable: isRuleValid,
        message: isRuleValid
          ? `QPA vs RefDes rule is available (version: ${metadata?.version || 'unknown'})`
          : 'QPA vs RefDes rule is not available or not valid',
      };
    } catch (error) {
      return {
        status: 'error',
        ruleAvailable: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}