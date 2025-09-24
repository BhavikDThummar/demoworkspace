import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinimalGoRulesModule } from '@org/minimal-gorules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MinimalGoRulesController } from './test-minimal-gorules/minimal-gorules.controller';
import { BomRulesModule } from './bom-rules';

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
    // BOM Rules Module
    BomRulesModule,
  ],
  controllers: [AppController, MinimalGoRulesController],
  providers: [AppService],
})
export class AppModule {}
