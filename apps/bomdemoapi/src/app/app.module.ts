import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoRulesModule } from '@org/gorules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoRulesController } from './gorules.controller';
import { BomDemoGoRulesService } from './gorules.service';
import { BusinessRulesController } from './examples/business-rules.controller';
import { BusinessRulesService } from './examples/business-rules.service';
import { SimpleRulesController } from './examples/simple-rules.controller';
import { SimpleRulesService } from './examples/simple-rules.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    GoRulesModule.forEnvironment(),
  ],
  controllers: [AppController, GoRulesController, BusinessRulesController, SimpleRulesController],
  providers: [AppService, BomDemoGoRulesService, BusinessRulesService, SimpleRulesService],
})
export class AppModule {}
