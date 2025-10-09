import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { MinimalGoRulesModule } from '@org/minimal-gorules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MinimalGoRulesController } from './test-minimal-gorules/minimal-gorules.controller';
import { CustomRuleEngineModule } from './custom-rule-engine';
import { NestjsRuleEngineModule } from './nestjs-rule-engine';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    // Minimal GoRules Engine with environment-based configuration
    MinimalGoRulesModule.forRootWithConfig({
      autoInitialize: true, // Auto-initialize on app startup
      configKey: 'minimalGoRules', // Look for config under this key, fallback to env vars
    }),
    // Custom Rule Engine Module (separate from GoRules)
    CustomRuleEngineModule,
    // NestJS Rule Engine Module (cm-rule-engine with NestJS binding)
    NestjsRuleEngineModule,
  ],
  controllers: [AppController, MinimalGoRulesController],
  providers: [
    AppService,
    // Global response interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
