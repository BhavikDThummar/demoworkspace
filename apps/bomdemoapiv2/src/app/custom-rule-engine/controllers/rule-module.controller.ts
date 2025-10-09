/**
 * Rule Module Controller
 * Serves compiled JavaScript rule modules to the UI
 */

import { Controller, Get, Header, HttpException, HttpStatus, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RuleModuleBuilderService } from '../services/rule-module-builder.service';

@Controller('custom-rules/modules')
export class RuleModuleController {
  private readonly logger = new Logger(RuleModuleController.name);

  constructor(private readonly ruleModuleBuilder: RuleModuleBuilderService) {}

  /**
   * Serve the compiled JavaScript module
   * This endpoint returns a valid ES module that can be dynamically imported by the UI
   */
  @Get('qpa-refdes.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('X-Content-Type-Options', 'nosniff')
  async getQpaRefDesModule(@Res() res: Response) {
    try {
      this.logger.log('Serving QPA RefDes rule module');

      const compiledModule = await this.ruleModuleBuilder.getCompiledModule();

      // Set additional security headers
      res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      return res.send(compiledModule);
    } catch (error) {
      this.logger.error('Failed to serve rule module', error);
      throw new HttpException(
        `Failed to serve rule module: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get module metadata and status
   */
  @Get('qpa-refdes/info')
  async getModuleInfo() {
    try {
      const info = this.ruleModuleBuilder.getModuleInfo();

      return {
        success: true,
        data: {
          module: 'qpa-refdes',
          ...info,
          endpoint: '/api/custom-rules/modules/qpa-refdes.js',
        },
      };
    } catch (error) {
      throw new HttpException(
        `Failed to get module info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Clear module cache and force recompilation
   */
  @Get('qpa-refdes/refresh')
  async refreshModule() {
    try {
      this.logger.log('Clearing rule module cache');
      this.ruleModuleBuilder.clearCache();

      // Trigger recompilation
      await this.ruleModuleBuilder.getCompiledModule();

      return {
        success: true,
        message: 'Rule module cache cleared and recompiled',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        `Failed to refresh module: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
