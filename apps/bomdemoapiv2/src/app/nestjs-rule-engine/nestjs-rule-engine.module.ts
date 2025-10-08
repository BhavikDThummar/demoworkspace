import { Module } from '@nestjs/common';
import { BomValidationController } from './controllers/bom-validation.controller';
import { BomRuleEngineService } from './services/rule-engine.service';

@Module({
  controllers: [BomValidationController],
  providers: [BomRuleEngineService],
  exports: [BomRuleEngineService],
})
export class NestjsRuleEngineModule {}
