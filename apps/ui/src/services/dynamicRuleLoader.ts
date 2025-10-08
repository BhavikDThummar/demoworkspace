/**
 * Dynamic Rule Loader - Safely loads and evaluates rules from API
 * This allows adding/changing rules without UI deployment
 */

import { Rule, RuleContext, ValidationError } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';

/**
 * Rule definition from API with functions as strings
 */
export interface DynamicRuleDefinition {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  tags: string[];
  transformCode?: string; // JavaScript function as string
  validateCode?: string;  // JavaScript function as string
  dependencies?: string[]; // List of utility functions this rule needs
}

/**
 * Utility functions available to dynamic rules
 */
const ruleUtilities = {
  // BOM parsing utilities
  parseRefDesig: (refDesig: string): string[] => {
    if (!refDesig || typeof refDesig !== 'string') {
      return [];
    }
    return refDesig.replace(/\s+/g, '').split(',').filter(item => item.length > 0);
  },

  normalizeQPA: (qpa: number | string): number => {
    if (typeof qpa === 'number') return qpa;
    const parsed = parseFloat(String(qpa));
    return isNaN(parsed) ? 0 : parsed;
  },

  // Validation helpers
  createError: (field: string, message: string, itemId: number, severity: 'error' | 'warning' = 'error'): ValidationError => ({
    field,
    message,
    severity,
    itemId,
  }),

  // Math utilities
  Math,
  
  // String utilities
  String,
  Number,
  Array,
  Object,
};

/**
 * Safe function evaluator with restricted context
 */
class SafeFunctionEvaluator {
  private static createSafeContext(utilities: typeof ruleUtilities) {
    return {
      // Allowed globals
      ...utilities,
      console: {
        log: console.log,
        warn: console.warn,
        error: console.error,
      },
      // Block dangerous globals
      window: undefined,
      document: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
    };
  }

  static evaluateFunction<T extends Function>(
    functionCode: string,
    functionName: string
  ): T | null {
    try {
      // Create a safe execution context
      const safeContext = this.createSafeContext(ruleUtilities);
      const contextKeys = Object.keys(safeContext);
      const contextValues = Object.values(safeContext);

      // Create function with restricted scope
      const wrappedCode = `
        return (${functionCode});
      `;

      const func = new Function(...contextKeys, wrappedCode);
      return func(...contextValues) as T;
    } catch (error) {
      console.error(`Failed to evaluate ${functionName}:`, error);
      console.error('Function code:', functionCode);
      return null;
    }
  }
}

/**
 * Dynamic Rule Loader Service
 */
export class DynamicRuleLoader {
  private static readonly API_BASE_URL = 'https://localhost:8001/api';

  /**
   * Load dynamic rules from API
   */
  static async loadDynamicRules(): Promise<Rule<IBOMItem>[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/custom-rules/qpa-refdes/dynamic-rules`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load dynamic rules');
      }

      return this.convertToRules(data.rules);
    } catch (error) {
      console.error('Failed to load dynamic rules:', error);
      throw error;
    }
  }

  /**
   * Convert API rule definitions to executable rules
   */
  private static convertToRules(dynamicRules: DynamicRuleDefinition[]): Rule<IBOMItem>[] {
    return dynamicRules.map(ruleDefinition => {
      const rule: Rule<IBOMItem> = {
        name: ruleDefinition.name,
        description: ruleDefinition.description,
        priority: ruleDefinition.priority,
        enabled: ruleDefinition.enabled,
        tags: ruleDefinition.tags,
      };

      // Evaluate transform function if provided
      if (ruleDefinition.transformCode) {
        const transformFn = SafeFunctionEvaluator.evaluateFunction(
          ruleDefinition.transformCode, 
          `${ruleDefinition.name}.transform`
        ) as ((context: RuleContext<IBOMItem>) => IBOMItem) | null;
        
        if (transformFn) {
          rule.transform = transformFn;
        } else {
          console.warn(`Failed to load transform function for rule: ${ruleDefinition.name}`);
        }
      }

      // Evaluate validate function if provided
      if (ruleDefinition.validateCode) {
        const validateFn = SafeFunctionEvaluator.evaluateFunction(
          ruleDefinition.validateCode, 
          `${ruleDefinition.name}.validate`
        ) as ((context: RuleContext<IBOMItem>) => ValidationError[]) | null;
        
        if (validateFn) {
          rule.validate = validateFn;
        } else {
          console.warn(`Failed to load validate function for rule: ${ruleDefinition.name}`);
        }
      }

      return rule;
    });
  }

  /**
   * Test a rule function before deployment
   */
  static testRuleFunction(functionCode: string, testData: IBOMItem[]): {
    success: boolean;
    error?: string;
    results?: unknown[];
  } {
    try {
      const testFn = SafeFunctionEvaluator.evaluateFunction(
        functionCode, 
        'test-function'
      ) as ((context: RuleContext<IBOMItem>) => unknown) | null;

      if (!testFn) {
        return { success: false, error: 'Failed to evaluate function' };
      }

      const results = testData.map((item, index) => {
        try {
          return testFn({
            item,
            allItems: testData,
            index,
            metadata: {},
          });
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      return { success: true, results };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}