/**
 * Custom Rule Engine Module
 * Separate from GoRules - handles custom BOM validation rules
 */

import { Module } from '@nestjs/common';
import { QpaRefDesRulesController } from './controllers/qpa-refdes-rules.controller';
import { QpaRefDesRulesService } from './services/qpa-refdes-rules.service';

@Module({
  controllers: [QpaRefDesRulesController],
  providers: [QpaRefDesRulesService],
  exports: [QpaRefDesRulesService],
})
export class CustomRuleEngineModule {}