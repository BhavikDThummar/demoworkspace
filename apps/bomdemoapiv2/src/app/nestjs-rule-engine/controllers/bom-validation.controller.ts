import { Controller, Post, Body } from '@nestjs/common';
import { BomRuleEngineService } from '../services/rule-engine.service';
import { IBOMItem } from '../interfaces/bom-types.interface';

@Controller('nestjs-rule-engine')
export class BomValidationController {
  constructor(private readonly bomRuleEngineService: BomRuleEngineService) {}

  @Post('validate')
  async validateBom(@Body() items: IBOMItem[]) {
    const result = await this.bomRuleEngineService.validateBomItems(items);
    return {
      success: true,
      data: result.data,
      errors: result.errors,
      summary: {
        totalItems: items.length,
        validItems: items.length - result.errors.length,
        invalidItems: result.errors.length,
        totalErrors: result.errors.length,
      },
    };
  }
}
