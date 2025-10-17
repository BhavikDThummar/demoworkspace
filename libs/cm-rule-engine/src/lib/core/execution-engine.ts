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
    mode: ExecutionMode = 'parallel',
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
    options: BatchOptions = {},
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
        this.processItem(item, i + batchIndex, data, rules, ruleExecutionMode).catch((error) => {
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
        }),
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
  private async executeParallel(data: T[], rules: Rule<T>[]): Promise<RuleExecutionResult<T>> {
    // Process all items in parallel
    const itemPromises = data.map((item, index) =>
      this.processItem(item, index, data, rules, 'parallel'),
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
  private async executeSequential(data: T[], rules: Rule<T>[]): Promise<RuleExecutionResult<T>> {
    const results: BatchItemResult<T>[] = [];

    // Process items sequentially
    for (let index = 0; index < data.length; index++) {
      const result = await this.processItem(data[index], index, data, rules, 'sequential');
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
    mode: ExecutionMode,
  ): Promise<BatchItemResult<T>> {
    const context: RuleContext<T> = {
      item,
      allItems,
      index,
    };

    // Apply transformations
    const transformedItem = await this.applyTransformations(item, context, rules, mode);

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
      mode,
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
    mode: ExecutionMode,
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
   * Execute all rules on all data items in parallel - ultra-fast performance mode
   * All combinations of data items and rules are executed concurrently without batching
   * Similar to minimal-gorules executeAllParallel method
   */
  async executeAllParallel(
    data: T[],
    rules: Rule<T>[],
    options: { continueOnError?: boolean } = {},
  ): Promise<RuleExecutionResult<T>> {
    const startTime = performance.now();
    const { continueOnError = true } = options;

    // Execute all combinations of data items and rules in parallel
    const allPromises = data.flatMap((item, itemIndex) =>
      rules.map(async (rule) => {
        const context: RuleContext<T> = {
          item,
          allItems: data,
          index: itemIndex,
        };

        try {
          // Apply transformation if exists
          let transformedItem = item;
          if (rule.transform) {
            transformedItem = await rule.transform({
              ...context,
              item: transformedItem,
            });
          }

          // Apply validation if exists
          let validationErrors: ValidationError[] = [];
          if (rule.validate) {
            validationErrors = await rule.validate({
              ...context,
              item: transformedItem,
            });
          }

          return {
            itemIndex,
            ruleName: rule.name,
            transformedItem,
            validationErrors,
            error: null,
          };
        } catch (error) {
          return {
            itemIndex,
            ruleName: rule.name,
            transformedItem: item,
            validationErrors: [],
            error: error as Error,
          };
        }
      }),
    );

    // Wait for all executions to complete
    const allResults = await Promise.all(allPromises);

    // Group results by item index
    const resultsByItem = new Map<
      number,
      {
        transformedItem: T;
        errors: ValidationError[];
        warnings: ValidationError[];
        hasSystemError: boolean;
      }
    >();

    // Initialize results for each item
    for (let i = 0; i < data.length; i++) {
      resultsByItem.set(i, {
        transformedItem: data[i],
        errors: [],
        warnings: [],
        hasSystemError: false,
      });
    }

    // Process all results
    for (const result of allResults) {
      const itemResult = resultsByItem.get(result.itemIndex) || {
        transformedItem: data[result.itemIndex],
        errors: [],
        warnings: [],
        hasSystemError: false,
      };

      if (result.error) {
        // System error during rule execution
        itemResult.errors.push({
          field: '_system',
          message: `Rule '${result.ruleName}' execution error: ${result.error.message}`,
          severity: 'error',
        });
        itemResult.hasSystemError = true;
        if (!continueOnError) {
          // In fail-fast mode, we still collect all results but mark as failed
        }
      } else {
        // Use the transformed item (last transformation wins for simplicity)
        if (result.transformedItem !== data[result.itemIndex]) {
          itemResult.transformedItem = result.transformedItem;
        }

        // Add validation errors and warnings
        for (const validationError of result.validationErrors) {
          if (validationError.severity === 'error') {
            itemResult.errors.push(validationError);
          } else {
            itemResult.warnings.push(validationError);
          }
        }
      }

      resultsByItem.set(result.itemIndex, itemResult);
    }

    // Convert to final result format
    const transformedData: T[] = [];
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    for (let i = 0; i < data.length; i++) {
      const itemResult = resultsByItem.get(i) || {
        transformedItem: data[i],
        errors: [],
        warnings: [],
        hasSystemError: false,
      };

      transformedData.push(itemResult.transformedItem);
      allErrors.push(...itemResult.errors);
      allWarnings.push(...itemResult.warnings);
    }

    const executionTime = performance.now() - startTime;
    const isValid = allErrors.length === 0;

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
   * Apply validation rules
   */
  private async applyValidations(
    item: T,
    context: RuleContext<T>,
    rules: Rule<T>[],
    mode: ExecutionMode,
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
