import { Injectable, Logger } from '@nestjs/common';
import { RuleEngineService as BaseRuleEngineService } from '@org/cm-rule-engine/nestjs';
import { Rule } from '@org/cm-rule-engine/nestjs';
import { IBOMItem } from '../interfaces/bom-types.interface';
// Import the secure TypeScript rules instead of eval-based rules
import { qpaRefDesRules } from '../../custom-rule-engine/rules/qpaRefDesRules.module';

@Injectable()
export class BomRuleEngineService {
  private readonly logger = new Logger(BomRuleEngineService.name);
  private ruleEngine: BaseRuleEngineService<IBOMItem>;

  constructor() {
    this.ruleEngine = new BaseRuleEngineService<IBOMItem>();
    this.loadRules();
  }

  /**
   * Load rules from the secure TypeScript module
   * These are the same rules used by the UI
   */
  private loadRules() {
    this.logger.log('Loading QPA RefDes rules from secure TypeScript module...');

    // Load rules from the TypeScript module
    qpaRefDesRules.forEach((rule: Rule<IBOMItem>) => {
      if (rule.enabled) {
        this.ruleEngine.addRule(rule);
        this.logger.debug(`Loaded rule: ${rule.name}`);
      }
    });

    this.logger.log(
      `Successfully loaded ${qpaRefDesRules.length} rules from qpaRefDesRules.module.ts`,
    );
  }

  async validateBomItems(items: IBOMItem[]) {
    return this.ruleEngine.process(items);
  }

  /**
   * Validate BOM items using ultra-fast parallel execution
   * All items and all rules are executed concurrently without batching
   */
  async validateBomItemsAllParallel(items: IBOMItem[], options?: { continueOnError?: boolean }) {
    return this.ruleEngine.processAllParallelWithAllRules(items, options);
  }

  /**
   * Validate BOM items using ultra-fast parallel execution with specific tags
   */
  async validateBomItemsAllParallelByTags(
    items: IBOMItem[],
    tags: string[],
    options?: { continueOnError?: boolean },
  ) {
    return this.ruleEngine.processAllParallel(items, { tags }, options);
  }
}
