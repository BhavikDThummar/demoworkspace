/**
 * Rule Module Controller
 * Serves compiled JavaScript rule modules to the UI
 */

import { Controller, Get, Header, HttpException, HttpStatus, Logger, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { RuleModuleBuilderService } from '../services/rule-module-builder.service';

@Controller('custom-rules/modules')
export class RuleModuleController {
  private readonly logger = new Logger(RuleModuleController.name);

  constructor(
    private readonly ruleModuleBuilder: RuleModuleBuilderService
  ) {}

  /**
   * Serve the compiled JavaScript module
   * This endpoint returns a valid ES module that can be dynamically imported by the UI
   */
  @Get('qpa-refdes.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('X-Content-Type-Options', 'nosniff')
  async getQpaRefDesModule(@Res() res: FastifyReply) {
    try {
      this.logger.log('Serving QPA RefDes rule module');

      const compiledModule = await this.ruleModuleBuilder.getCompiledModule();

      // Set additional security headers
      res.header('Access-Control-Allow-Origin', '*'); // Adjust for production
      res.header('Cross-Origin-Resource-Policy', 'cross-origin');

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

  /**
   * Get signed module with cryptographic signature
   */
  @Get('qpa-refdes/signed')
  async getSignedModule() {
    try {
      this.logger.log('Serving signed QPA RefDes rule module');
      
      const signedModule = await this.ruleModuleBuilder.getSignedModule();
      
      return {
        success: true,
        data: signedModule,
        message: 'Signed module retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to serve signed module', error);
      throw new HttpException(
        `Failed to serve signed module: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get public key for signature verification
   */
  @Get('qpa-refdes/public-key')
  async getPublicKey() {
    try {
      this.logger.log('Serving public key for module verification');
      
      const keyInfo = this.ruleModuleBuilder.getSigningInfo();
      
      return {
        success: true,
        data: {
          keyId: keyInfo.keyId,
          publicKey: keyInfo.publicKey,
          algorithm: keyInfo.algorithm,
        },
        message: 'Public key retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Failed to serve public key', error);
      throw new HttpException(
        `Failed to serve public key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Rotate signing keys
   */
  @Get('qpa-refdes/rotate-keys')
  async rotateKeys() {
    try {
      this.logger.log('Rotating signing keys');
      
      const newKeyId = this.ruleModuleBuilder.rotateSigningKeys();
      
      return {
        success: true,
        data: {
          newKeyId,
          message: 'Signing keys rotated successfully',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to rotate keys', error);
      throw new HttpException(
        `Failed to rotate keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}