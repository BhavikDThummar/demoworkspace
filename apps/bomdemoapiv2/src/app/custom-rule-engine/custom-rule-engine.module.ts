/**
 * Custom Rule Engine Module
 * Separate from GoRules - handles custom BOM validation rules
 */

import { Module } from '@nestjs/common';
import { RuleModuleController } from './controllers/rule-module.controller';
import { RuleModuleBuilderService } from './services/rule-module-builder.service';

@Module({
  controllers: [RuleModuleController],
  providers: [RuleModuleBuilderService],
  exports: [RuleModuleBuilderService],
})
export class CustomRuleEngineModule {}