/**
 * Service interfaces for the minimal GoRules engine
 */

import { MinimalRuleMetadata, RuleSelector, MinimalExecutionResult } from './core.js';
import { ITagManager } from '../tag-manager/interfaces.js';

/**
 * Rule cache manager interface
 */
export interface IRuleCacheManager {
  // Cache operations
  get(ruleId: string): Promise<Buffer | null>;
  set(ruleId: string, data: Buffer, metadata: MinimalRuleMetadata): Promise<void>;
  getMetadata(ruleId: string): Promise<MinimalRuleMetadata | null>;
  
  // Bulk operations
  getMultiple(ruleIds: string[]): Promise<Map<string, Buffer>>;
  setMultiple(rules: Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>): Promise<void>;
  
  // Tag operations
  getRulesByTags(tags: string[]): Promise<string[]>;
  
  // Version management
  isVersionCurrent(ruleId: string, version: string): Promise<boolean>;
  invalidate(ruleId: string): Promise<void>;
  clear(): Promise<void>;
  
  // Metadata operations
  getAllMetadata(): Promise<Map<string, MinimalRuleMetadata>>;
}

/**
 * Rule loader service interface
 */
export interface IRuleLoaderService {
  // Project-wide loading (primary method - called at startup)
  loadAllRules(projectId: string): Promise<Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>>;
  
  // Individual rule loading (for updates)
  loadRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }>;
  
  // Version management
  checkVersions(rules: Map<string, string>): Promise<Map<string, boolean>>; // ruleId -> needsUpdate
  refreshRule(ruleId: string): Promise<{ data: Buffer; metadata: MinimalRuleMetadata }>;
}

/**
 * Execution engine interface
 */
export interface IExecutionEngine {
  // Core execution
  execute<T>(selector: RuleSelector, input: Record<string, unknown>): Promise<MinimalExecutionResult<T>>;
  
  // Single rule execution
  executeRule<T>(ruleId: string, input: Record<string, unknown>): Promise<T>;
  
  // Validation
  validateRule(ruleId: string): Promise<boolean>;
}

// Re-export TagManager interface
export type { ITagManager };