/**
 * ExecutionEngine - Handles rule execution with different strategies
 * Supports parallel and sequential execution modes with batch processing
 */

import {
  Rule,
  RuleContext,
  RuleExecutionResult,
  BatchItemResult,
  ValidationError,
  ExecutionMode,
  BatchOptions,
} from './types';

export class ExecutionEngine<T = unknown> {
  /**
   * Execute rules on dataset
   */
  async execute(
    data: T[],
    rules: Rule<T>[],
    mode: ExecutionMode = 'parallel'
  ): Promise<RuleExecutionResult<T>> {
    const startTime = performance.now();

    const result =
      mode === 'parallel'
        ? await this.executeParallel(data, rules)
        : await this.executeSequential(data, rules);

    const executionTime = performance.now() - startTime;

    return {
      ...result,
      executionTime,
      rulesExecuted: rules.length,
    };
  }

  /**
   * Execute batch with controlled concurrency
   */
  async executeBatch(
    data: T[],
    rules: Rule<T>[],
    options: BatchOptions = {}
  ): Promise<RuleExecutionResult<T>> {
    const startTime = performance.now();
    const {
      maxConcurrency = 1000,
      ruleExecutionMode = 'parallel',
      continueOnError = true,
    } = options;

    const results: BatchItemResult<T>[] = [];
    const batchSize = maxConcurrency;

    // Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length));
      const batchPromises = batch.map((item, batchIndex) =>
        this.processItem(
          item,
          i + batchIndex,
          data,
          rules,
          ruleExecutionMode
        ).catch((error) => {
          if (!continueOnError) {
            throw error;
          }
          // Return error result for this item
          return {
            index: i + batchIndex,
            data: item,
            errors: [
              {
                field: '_system',
                message: `Execution error: ${error.message}`,
                severity: 'error' as const,
              },
            ],
            warnings: [],
            isValid: false,
          };
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // Aggregate results
    const transformedData = results.map((r) => r.data);
    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);
    const isValid = allErrors.length === 0;
    const executionTime = performance.now() - startTime;

    return {
      data: transformedData,
      errors: allErrors,
      warnings: allWarnings,
      isValid,
      executionTime,
      rulesExecuted: rules.length,
    };
  }

  /**
   * Execute rules in parallel mode
   * All items are processed concurrently
   */
  private async executeParallel(
    data: T[],
    rules: Rule<T>[]
  ): Promise<RuleExecutionResult<T>> {
    // Process all items in parallel
    const itemPromises = data.map((item, index) =>
      this.processItem(item, index, data, rules, 'parallel')
    );

    const results = await Promise.all(itemPromises);

    // Aggregate results
    const transformedData = results.map((r) => r.data);
    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);
    const isValid = allErrors.length === 0;

    return {
      data: transformedData,
      errors: allErrors,
      warnings: allWarnings,
      isValid,
      executionTime: 0, // Set by execute method
      rulesExecuted: rules.length,
    };
  }

  /**
   * Execute rules in sequential mode
   * Items are processed one after another
   */
  private async executeSequential(
    data: T[],
    rules: Rule<T>[]
  ): Promise<RuleExecutionResult<T>> {
    const results: BatchItemResult<T>[] = [];

    // Process items sequentially
    for (let index = 0; index < data.length; index++) {
      const result = await this.processItem(
        data[index],
        index,
        data,
        rules,
        'sequential'
      );
      results.push(result);
    }

    // Aggregate results
    const transformedData = results.map((r) => r.data);
    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);
    const isValid = allErrors.length === 0;

    return {
      data: transformedData,
      errors: allErrors,
      warnings: allWarnings,
      isValid,
      executionTime: 0, // Set by execute method
      rulesExecuted: rules.length,
    };
  }

  /**
   * Process a single item through rules
   */
  private async processItem(
    item: T,
    index: number,
    allItems: T[],
    rules: Rule<T>[],
    mode: ExecutionMode
  ): Promise<BatchItemResult<T>> {
    const context: RuleContext<T> = {
      item,
      allItems,
      index,
    };

    // Apply transformations
    const transformedItem = await this.applyTransformations(
      item,
      context,
      rules,
      mode
    );

    // Update context with transformed item
    const transformedContext: RuleContext<T> = {
      ...context,
      item: transformedItem,
    };

    // Apply validations
    const validationErrors = await this.applyValidations(
      transformedItem,
      transformedContext,
      rules,
      mode
    );

    // Separate errors and warnings
    const errors = validationErrors.filter((e) => e.severity === 'error');
    const warnings = validationErrors.filter((e) => e.severity === 'warning');

    return {
      index,
      data: transformedItem,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  }

  /**
   * Apply transformation rules
   */
  private async applyTransformations(
    item: T,
    context: RuleContext<T>,
    rules: Rule<T>[],
    mode: ExecutionMode
  ): Promise<T> {
    let transformedItem = item;

    // Filter rules that have transform functions
    const transformRules = rules.filter((rule) => rule.transform);

    if (mode === 'parallel') {
      // In parallel mode, all transformations receive the original item
      // and we need to merge results (this is a design choice)
      // For simplicity, we'll execute sequentially for transformations
      // since they modify the item and order matters
      for (const rule of transformRules) {
        if (rule.transform) {
          const updatedContext: RuleContext<T> = {
            ...context,
            item: transformedItem,
          };
          transformedItem = await rule.transform(updatedContext);
        }
      }
    } else {
      // Sequential mode - execute transformations in order
      for (const rule of transformRules) {
        if (rule.transform) {
          const updatedContext: RuleContext<T> = {
            ...context,
            item: transformedItem,
          };
          transformedItem = await rule.transform(updatedContext);
        }
      }
    }

    return transformedItem;
  }

  /**
   * Apply validation rules
   */
  private async applyValidations(
    item: T,
    context: RuleContext<T>,
    rules: Rule<T>[],
    mode: ExecutionMode
  ): Promise<ValidationError[]> {
    // Filter rules that have validate functions
    const validationRules = rules.filter((rule) => rule.validate);

    if (mode === 'parallel') {
      // Execute all validations in parallel
      const validationPromises = validationRules.map((rule) => {
        if (rule.validate) {
          return rule.validate(context);
        }
        return Promise.resolve([]);
      });
      const validationResults = await Promise.all(validationPromises);
      return validationResults.flat();
    } else {
      // Execute validations sequentially
      const allErrors: ValidationError[] = [];
      for (const rule of validationRules) {
        if (rule.validate) {
          const errors = await rule.validate(context);
          allErrors.push(...errors);
        }
      }
      return allErrors;
    }
  }
}
