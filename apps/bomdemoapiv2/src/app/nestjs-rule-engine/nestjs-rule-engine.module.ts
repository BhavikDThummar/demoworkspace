import { Module } from '@nestjs/common';
import { RuleEngineModule } from '@org/cm-rule-engine/nestjs';
import { BomValidationController } from './controllers/bom-validation.controller';
import { BomRuleEngineService } from './services/rule-engine.service';

@Module({
  imports: [
    // Import the new cm-rule-engine with batch data capabilities
    RuleEngineModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [BomValidationController],
  providers: [BomRuleEngineService],
  exports: [BomRuleEngineService],
})
export class NestjsRuleEngineModule {}
