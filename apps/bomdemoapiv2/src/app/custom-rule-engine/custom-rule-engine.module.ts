/**
 * Custom Rule Engine Module
 * Separate from GoRules - handles custom BOM validation rules
 */

import { Module } from '@nestjs/common';
import { RuleEngineModule } from '@org/cm-rule-engine/nestjs';
import { RuleModuleController } from './controllers/rule-module.controller';
import { RuleModuleBuilderService } from './services/rule-module-builder.service';
import { ModuleSigningService } from './services/module-signing.service';
import { BatchDataRulesService } from './services/batch-data-rules.service';
import { DataEnrichmentService } from './services/data-enrichment.service';

@Module({
  imports: [
    // Import RuleEngineModule to get BatchDataRuleFactory
    RuleEngineModule.forRoot(),
  ],
  controllers: [RuleModuleController],
  providers: [RuleModuleBuilderService, ModuleSigningService, BatchDataRulesService, DataEnrichmentService],
  exports: [RuleModuleBuilderService, ModuleSigningService, BatchDataRulesService, DataEnrichmentService],
})
export class CustomRuleEngineModule {}
