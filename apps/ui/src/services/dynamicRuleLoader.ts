import { Rule, RuleContext, ValidationError } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';

export interface DynamicRuleDefinition {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  tags: string[];
  transformCode?: string;
  validateCode?: string;
  dependencies?: string[];
}

/** Utilities available to dynamic rules */
const ruleUtilities = {
  parseRefDesig: (refDesig: string): string[] =>
    !refDesig || typeof refDesig !== 'string'
      ? []
      : refDesig.replace(/\s+/g, '').split(',').filter(Boolean),

  normalizeQPA: (qpa: number | string): number => {
    if (typeof qpa === 'number') return qpa;
    const parsed = parseFloat(String(qpa));
    return isNaN(parsed) ? 0 : parsed;
  },

  createError: (
    field: string,
    message: string,
    itemId: number,
    severity: 'error' | 'warning' = 'error'
  ): ValidationError => ({ field, message, severity, itemId }),

  Math,
  String,
  Number,
  Array,
  Object,
};

/** Evaluate JavaScript code safely in a restricted context */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function evaluateFunction<T extends Function>(
  functionCode: string,
  functionName: string
): T | null {
  try {
    const safeContext = {
      ...ruleUtilities,
      console: { log: console.log, warn: console.warn, error: console.error },
      window: undefined,
      document: undefined,
      fetch: undefined,
      // fetch: fetch.bind(window),
      XMLHttpRequest: undefined,
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
    };

    const contextKeys = Object.keys(safeContext);
    const contextValues = Object.values(safeContext);
    const wrappedCode = `return (${functionCode});`;

    const func = Function.apply(null, [...contextKeys, wrappedCode]);
    return func(...contextValues) as T;
  } catch (error) {
    console.error(`Failed to evaluate ${functionName}:`, error);
    console.error('Function code:', functionCode);
    return null;
  }
}

/** Convert API rule definitions to executable rules */
export function convertToRules(dynamicRules: DynamicRuleDefinition[]): Rule<IBOMItem>[] {
  return dynamicRules.map((ruleDef) => {
    const rule: Rule<IBOMItem> = {
      name: ruleDef.name,
      description: ruleDef.description,
      priority: ruleDef.priority,
      enabled: ruleDef.enabled,
      tags: ruleDef.tags,
    };

    if (ruleDef.transformCode) {
      const transformFn = evaluateFunction<(context: RuleContext<IBOMItem>) => IBOMItem>(
        ruleDef.transformCode,
        `${ruleDef.name}.transform`
      );
      if (transformFn) {
        rule.transform = transformFn;
      } else {
        console.warn(`Failed to load transform function for rule: ${ruleDef.name}`);
      }
    }

    if (ruleDef.validateCode) {
      const validateFn = evaluateFunction<(context: RuleContext<IBOMItem>) => ValidationError[]>(
        ruleDef.validateCode,
        `${ruleDef.name}.validate`
      );
      if (validateFn) {
        rule.validate = validateFn;
      } else {
        console.warn(`Failed to load validate function for rule: ${ruleDef.name}`);
      }
    }

    return rule;
  });
}
