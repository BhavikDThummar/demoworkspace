/**
 * Custom Rule Engine Module
 * Separate from GoRules - handles custom BOM validation rules
 */

import { Module } from '@nestjs/common';
import { RuleModuleController } from './controllers/rule-module.controller';
import { RuleModuleBuilderService } from './services/rule-module-builder.service';
import { ModuleSigningService } from './services/module-signing.service';

@Module({
  controllers: [RuleModuleController],
  providers: [RuleModuleBuilderService, ModuleSigningService],
  exports: [RuleModuleBuilderService, ModuleSigningService],
})
export class CustomRuleEngineModule {}