/**
 * BOM Rules Module
 * Contains controllers and services for BOM validation rules
 */

import { Module } from '@nestjs/common';
import { QpaRefDesRuleController } from './controllers/qpa-refdes-rule.controller';
import { QpaRefDesRuleService } from './services/qpa-refdes-rule.service';

@Module({
  controllers: [QpaRefDesRuleController],
  providers: [QpaRefDesRuleService],
  exports: [QpaRefDesRuleService],
})
export class BomRulesModule {}