import { Injectable } from '@nestjs/common';
import { RuleEngineService as BaseRuleEngineService } from '@org/cm-rule-engine/nestjs';
import { Rule } from '@org/cm-rule-engine/nestjs';
import { IBOMItem } from '../interfaces/bom-types.interface';
import { dynamicQpaRefDesRules, DynamicRuleDefinition } from '../rules/dynamicQpaRefDesRules';
import { parseRefDesig, normalizeQPA, createError } from '../utils/rule-helpers';

@Injectable()
export class BomRuleEngineService {
  private ruleEngine: BaseRuleEngineService<IBOMItem>;

  constructor() {
    this.ruleEngine = new BaseRuleEngineService<IBOMItem>();
    this.loadRules();
  }

  private loadRules() {
    const helperFunctions = { parseRefDesig, normalizeQPA, createError };

    dynamicQpaRefDesRules.forEach((ruleDef: DynamicRuleDefinition) => {
      const rule: Rule<IBOMItem> = {
        name: ruleDef.name,
        description: ruleDef.description,
        priority: ruleDef.priority,
        enabled: ruleDef.enabled,
        tags: ruleDef.tags,
      };

      if (ruleDef.transformCode) {
        rule.transform = this.createFunction(ruleDef.transformCode, helperFunctions);
      }

      if (ruleDef.validateCode) {
        rule.validate = this.createFunction(ruleDef.validateCode, helperFunctions);
      }

      this.ruleEngine.addRule(rule);
    });
    console.log('Custom Rule engine: Rules are loaded!');
  }

  private createFunction(code: string, helpers: Record<string, unknown>) {
    const helperNames = Object.keys(helpers);
    const helperValues = Object.values(helpers);
    return new Function(...helperNames, `return ${code}`)(...helperValues);
  }

  async validateBomItems(items: IBOMItem[]) {
    return this.ruleEngine.process(items);
  }
}
