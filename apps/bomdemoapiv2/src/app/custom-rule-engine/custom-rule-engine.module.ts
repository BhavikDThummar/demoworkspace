/**
 * Custom Rule Engine Module
 * Separate from GoRules - handles custom BOM validation rules
 */

import { Module } from '@nestjs/common';
import { QpaRefDesRulesController } from './controllers/qpa-refdes-rules.controller';
import { RuleModuleController } from './controllers/rule-module.controller';
import { QpaRefDesRulesService } from './services/qpa-refdes-rules.service';
import { RuleModuleBuilderService } from './services/rule-module-builder.service';

@Module({
  controllers: [QpaRefDesRulesController, RuleModuleController],
  providers: [QpaRefDesRulesService, RuleModuleBuilderService],
  exports: [QpaRefDesRulesService, RuleModuleBuilderService],
})
export class CustomRuleEngineModule {}