import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoRulesModule } from '@org/gorules';
import { MinimalGoRulesModule } from '@org/minimal-gorules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoRulesController } from './gorules.controller';
import { BomDemoGoRulesService } from './gorules.service';
import { BusinessRulesController } from './examples/business-rules.controller';
import { BusinessRulesService } from './examples/business-rules.service';
import { SimpleRulesController } from './examples/simple-rules.controller';
import { SimpleRulesService } from './examples/simple-rules.service';
import { MinimalGoRulesController } from './examples/minimal-gorules.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    GoRulesModule.forEnvironment(),
    // Minimal GoRules Engine with environment-based configuration
    MinimalGoRulesModule.forRootWithConfig({
      autoInitialize: true, // Auto-initialize on app startup
      configKey: 'minimalGoRules' // Look for config under this key, fallback to env vars
    }),
  ],
  controllers: [
    AppController, 
    GoRulesController, 
    BusinessRulesController, 
    SimpleRulesController,
    MinimalGoRulesController
  ],
  providers: [
    AppService, 
    BomDemoGoRulesService, 
    BusinessRulesService, 
    SimpleRulesService
  ],
})
export class AppModule {}
