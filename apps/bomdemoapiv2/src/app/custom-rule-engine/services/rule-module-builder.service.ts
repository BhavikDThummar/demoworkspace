/**
 * Rule Module Builder Service
 * Compiles TypeScript rule files to JavaScript modules that can be loaded by the UI
 */

import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RuleModuleBuilderService {
  private readonly logger = new Logger(RuleModuleBuilderService.name);
  // Use process.cwd() to get workspace root, then navigate to source file
  private readonly ruleSourcePath = path.join(
    process.cwd(),
    'apps/bomdemoapiv2/src/app/custom-rule-engine/rules/qpaRefDesRules.module.ts'
  );
  private readonly compiledOutputPath = path.join(
    process.cwd(),
    'apps/bomdemoapiv2/src/app/custom-rule-engine/rules/compiled/qpaRefDesRules.module.js'
  );
  private cachedModule: string | null = null;
  private lastCompileTime = 0;

  /**
   * Get the compiled JavaScript module
   * Compiles on-demand if not cached or source has changed
   */
  async getCompiledModule(): Promise<string> {
    try {
      this.logger.debug(`Looking for rule source at: ${this.ruleSourcePath}`);
      
      // Check if source file exists
      if (!fs.existsSync(this.ruleSourcePath)) {
        throw new Error(`Rule source file not found at: ${this.ruleSourcePath}`);
      }
      
      // Check if source file has been modified
      const sourceStats = fs.statSync(this.ruleSourcePath);
      const sourceModifiedTime = sourceStats.mtimeMs;

      // Return cached version if still valid
      if (this.cachedModule && sourceModifiedTime <= this.lastCompileTime) {
        this.logger.debug('Returning cached compiled module');
        return this.cachedModule;
      }

      // Compile the TypeScript file
      this.logger.log('Compiling rule module from TypeScript...');
      const compiledCode = await this.compileTypeScriptToJS();

      // Cache the result
      this.cachedModule = compiledCode;
      this.lastCompileTime = Date.now();

      // Optionally save to disk for debugging
      this.saveCompiledModule(compiledCode);

      this.logger.log('Rule module compiled successfully');
      return compiledCode;
    } catch (error) {
      this.logger.error('Failed to compile rule module', error);
      throw new Error(`Failed to compile rule module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compile TypeScript to JavaScript using TypeScript compiler API
   */
  private async compileTypeScriptToJS(): Promise<string> {
    // Read the source file
    const sourceCode = fs.readFileSync(this.ruleSourcePath, 'utf-8');

    // Compiler options for browser-compatible ES module
    const compilerOptions: ts.CompilerOptions = {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: false,
      sourceMap: false,
      removeComments: true,
      // Don't resolve imports - they'll be resolved by the browser
      noResolve: false,
    };

    // Transpile
    const result = ts.transpileModule(sourceCode, {
      compilerOptions,
      fileName: 'qpaRefDesRules.module.ts',
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics.map(d => 
        ts.flattenDiagnosticMessageText(d.messageText, '\n')
      ).join('\n');
      throw new Error(`TypeScript compilation errors:\n${errors}`);
    }

    // Replace the import statement to use the CDN or local path
    let jsCode = result.outputText;
    
    // Replace the @org/cm-rule-engine import with a relative path or CDN
    // For now, we'll assume the UI has the types available
    jsCode = jsCode.replace(
      /import\s+{[^}]+}\s+from\s+['"]@org\/cm-rule-engine['"]/g,
      '// Types are available in the UI environment'
    );

    return jsCode;
  }

  /**
   * Save compiled module to disk for debugging/caching
   */
  private saveCompiledModule(code: string): void {
    try {
      const outputDir = path.dirname(this.compiledOutputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(this.compiledOutputPath, code, 'utf-8');
      this.logger.debug(`Compiled module saved to ${this.compiledOutputPath}`);
    } catch (error) {
      this.logger.warn('Failed to save compiled module to disk', error);
    }
  }

  /**
   * Clear the cache to force recompilation
   */
  clearCache(): void {
    this.cachedModule = null;
    this.lastCompileTime = 0;
    this.logger.log('Rule module cache cleared');
  }

  /**
   * Get module metadata
   */
  getModuleInfo() {
    const sourceExists = fs.existsSync(this.ruleSourcePath);
    const compiledExists = fs.existsSync(this.compiledOutputPath);
    
    let sourceModifiedTime = null;
    let compiledModifiedTime = null;

    if (sourceExists) {
      sourceModifiedTime = fs.statSync(this.ruleSourcePath).mtime;
    }

    if (compiledExists) {
      compiledModifiedTime = fs.statSync(this.compiledOutputPath).mtime;
    }

    return {
      ruleSourcePath: this.ruleSourcePath,
      compiledOutputPath: this.compiledOutputPath,
      sourceExists,
      compiledExists,
      sourceModifiedTime,
      compiledModifiedTime,
      isCached: !!this.cachedModule,
      lastCompileTime: this.lastCompileTime ? new Date(this.lastCompileTime) : null,
    };
  }
}
