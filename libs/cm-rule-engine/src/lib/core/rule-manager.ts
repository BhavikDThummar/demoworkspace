/**
 * RuleManager - Manages rule registration, organization, and retrieval
 * Provides O(1) tag-to-rule lookup through tag indexing
 */

import { Rule, RuleSelector } from './types';

export class RuleManager<T = any> {
  private rules: Map<string, Rule<T>>;
  private tagIndex: Map<string, Set<string>>; // tag -> rule names

  constructor() {
    this.rules = new Map();
    this.tagIndex = new Map();
  }

  /**
   * Add a rule to the registry
   * Updates tag index for efficient tag-based lookups
   */
  addRule(rule: Rule<T>): void {
    // Store the rule
    this.rules.set(rule.name, rule);

    // Update tag index
    this.updateTagIndex(rule);
  }

  /**
   * Remove a rule from the registry
   * Cleans up tag index entries
   */
  removeRule(name: string): void {
    const rule = this.rules.get(name);
    if (!rule) {
      return;
    }

    // Remove from tag index
    if (rule.tags) {
      for (const tag of rule.tags) {
        const ruleNames = this.tagIndex.get(tag);
        if (ruleNames) {
          ruleNames.delete(name);
          // Clean up empty tag entries
          if (ruleNames.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }

    // Remove the rule
    this.rules.delete(name);
  }

  /**
   * Get a rule by name
   */
  getRule(name: string): Rule<T> | undefined {
    return this.rules.get(name);
  }

  /**
   * Get all rules (enabled and disabled)
   */
  getAllRules(): Rule<T>[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get enabled rules sorted by priority (lower number = higher priority)
   */
  getEnabledRules(): Rule<T>[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get rules by tags (returns rules that have ANY of the specified tags)
   */
  getRulesByTags(tags: string[]): Rule<T>[] {
    const ruleNames = new Set<string>();

    // Collect all rule names that match any of the tags
    for (const tag of tags) {
      const namesForTag = this.tagIndex.get(tag);
      if (namesForTag) {
        namesForTag.forEach(name => ruleNames.add(name));
      }
    }

    // Get the actual rule objects and sort by priority
    return Array.from(ruleNames)
      .map(name => this.rules.get(name))
      .filter((rule): rule is Rule<T> => rule !== undefined)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Resolve rule selector to actual rules
   * Handles both name-based and tag-based selection
   */
  resolveSelector(selector: RuleSelector): Rule<T>[] {
    let selectedRules: Rule<T>[] = [];

    // If specific names are provided, use those
    if (selector.names && selector.names.length > 0) {
      selectedRules = selector.names
        .map(name => this.rules.get(name))
        .filter((rule): rule is Rule<T> => rule !== undefined);
    }
    // If tags are provided, get rules by tags
    else if (selector.tags && selector.tags.length > 0) {
      selectedRules = this.getRulesByTags(selector.tags);
    }
    // Otherwise, get all enabled rules
    else {
      selectedRules = this.getEnabledRules();
    }

    // Filter to only enabled rules and sort by priority
    return selectedRules
      .filter(rule => rule.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(name: string, enabled: boolean): void {
    const rule = this.rules.get(name);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Update tag index when rules are added
   * Maintains O(1) tag-to-rule lookup
   */
  private updateTagIndex(rule: Rule<T>): void {
    if (!rule.tags) {
      return;
    }

    for (const tag of rule.tags) {
      let ruleNames = this.tagIndex.get(tag);
      if (!ruleNames) {
        ruleNames = new Set<string>();
        this.tagIndex.set(tag, ruleNames);
      }
      ruleNames.add(rule.name);
    }
  }
}
