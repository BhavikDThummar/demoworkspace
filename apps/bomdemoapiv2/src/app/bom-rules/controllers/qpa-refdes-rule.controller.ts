/**
 * Controller for QPA vs RefDes rule execution
 */

import { Controller, Post, Body, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { QpaRefDesRuleService } from '../services/qpa-refdes-rule.service';
import type { IBOMValidationResponse } from '../interfaces/bom-item.interface';
import { IBOMValidationRequest } from '../interfaces/bom-item.interface';

@Controller('bom-rules/qpa-refdes')
export class QpaRefDesRuleController {
  private readonly logger = new Logger(QpaRefDesRuleController.name);

  constructor(private readonly qpaRefDesRuleService: QpaRefDesRuleService) {}

  /**
   * Execute QPA vs RefDes validation rule
   */
  @Post('validate')
  async validateBomItem(@Body() request: IBOMValidationRequest): Promise<IBOMValidationResponse> {
    try {
      this.logger.log(
        `Received QPA vs RefDes validation request for BOM item: ${
          request.bomItem?.lineID || 'unknown'
        }`,
      );

      // Basic request validation
      if (!request.bomItem) {
        throw new HttpException('bomItem is required', HttpStatus.BAD_REQUEST);
      }

      if (!request.configData) {
        throw new HttpException('configData is required', HttpStatus.BAD_REQUEST);
      }

      // Execute the rule
      const result = await this.qpaRefDesRuleService.executeQpaRefDesRule(request);

      this.logger.log(`QPA vs RefDes validation completed with success: ${result.success}`);

      return result;
    } catch (error) {
      this.logger.error(
        `QPA vs RefDes validation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to validate BOM item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test endpoint with sample BOM item data
   */
  @Post('test')
  async testWithSampleData(): Promise<IBOMValidationResponse> {
    const sampleRequest: IBOMValidationRequest = {
      bomItem: {
        lineID: 1,
        custPN: 'CPN-1001',
        qpa: 4,
        refDesig: 'R1, R2, R3, R4',
        refDesigCount: 4,
        dnpQty: '0',
        dnpDesig: '',
        dnpDesigCount: 0,
        uomID: 'EACH',
        mfgPNDescription: 'Resistor 10k Ohm',
        mfgCode: 'MFR-A',
        mfgPN: 'MPN-1001',
        description: 'Check resistor tolerance',
        mountingtypes: 'SMD',
        functionaltypes: 'Resistor',
        field1: 'data1-1',
        field2: 'data1-2',
        field3: 'data1-3',
        field4: 'data1-4',
        field5: 'data1-5',
        field6: 'data1-6',
        field7: 'data1-7',
      },
      configData: {
        _OddelyRefDesList: ['p?', 'P*'],
        maxREFDESAllow: 50,
        _UOM: {
          EACH: 'EACH',
        },
      },
      validationFlags: {},
      otherValidation: {},
    };

    this.logger.log('Testing QPA vs RefDes rule with sample data');

    return this.validateBomItem(sampleRequest);
  }

  /**
   * Get rule health status
   */
  @Get('health')
  async getHealth() {
    try {
      const healthStatus = await this.qpaRefDesRuleService.healthCheck();

      return {
        service: 'QPA vs RefDes Rule Service',
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

  /**
   * Get rule metadata
   */
  @Get('metadata')
  async getRuleMetadata() {
    try {
      const metadata = await this.qpaRefDesRuleService.getRuleMetadata();

      if (!metadata) {
        throw new HttpException('QPA vs RefDes rule not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        ruleId: 'QPA vs RefDes',
        metadata,
        message: 'Rule metadata retrieved successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to get rule metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate that the rule is available
   */
  @Get('validate-rule')
  async validateRule() {
    try {
      const isValid = await this.qpaRefDesRuleService.validateRule();

      return {
        success: true,
        ruleId: 'QPA vs RefDes',
        isValid,
        message: isValid
          ? 'QPA vs RefDes rule is valid and available'
          : 'QPA vs RefDes rule is not valid or not found',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to validate rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
