/**
 * Minimal Rule Cache Manager with LRU eviction
 * High-performance, thread-safe caching with O(1) operations
 */

import { IRuleCacheManager, MinimalRuleMetadata } from '../interfaces/index.js';

/**
 * Node for doubly-linked list used in LRU implementation
 */
class LRUNode {
  constructor(
    public key: string,
    public prev: LRUNode | null = null,
    public next: LRUNode | null = null
  ) {}
}

/**
 * Simple read-write lock implementation for thread safety
 */
class ReadWriteLock {
  private readers = 0;
  private writer = false;
  private waitingWriters = 0;
  private readerQueue: Array<() => void> = [];
  private writerQueue: Array<() => void> = [];

  async acquireRead(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.writer && this.waitingWriters === 0) {
        this.readers++;
        resolve();
      } else {
        this.readerQueue.push(() => {
          this.readers++;
          resolve();
        });
      }
    });
  }

  releaseRead(): void {
    this.readers--;
    this.processQueue();
  }

  async acquireWrite(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.writer && this.readers === 0) {
        this.writer = true;
        resolve();
      } else {
        this.waitingWriters++;
        this.writerQueue.push(() => {
          this.waitingWriters--;
          this.writer = true;
          resolve();
        });
      }
    });
  }

  releaseWrite(): void {
    this.writer = false;
    this.processQueue();
  }

  private processQueue(): void {
    if (this.writerQueue.length > 0 && !this.writer && this.readers === 0) {
      const nextWriter = this.writerQueue.shift()!;
      nextWriter();
    } else if (this.readerQueue.length > 0 && !this.writer && this.waitingWriters === 0) {
      while (this.readerQueue.length > 0) {
        const nextReader = this.readerQueue.shift()!;
        nextReader();
      }
    }
  }
}

/**
 * Minimal Rule Cache Manager with LRU eviction policy
 * Optimized for high performance with O(1) cache operations
 */
export class MinimalRuleCacheManager implements IRuleCacheManager {
  private readonly rules = new Map<string, Buffer>();
  private readonly metadata = new Map<string, MinimalRuleMetadata>();
  private readonly tagIndex = new Map<string, Set<string>>(); // tag -> ruleIds
  private readonly lruNodes = new Map<string, LRUNode>();
  private readonly lock = new ReadWriteLock();
  
  // LRU doubly-linked list
  private readonly head = new LRUNode('HEAD');
  private readonly tail = new LRUNode('TAIL');
  
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    // Initialize doubly-linked list
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Get rule data by ID with LRU update
   */
  async get(ruleId: string): Promise<Buffer | null> {
    await this.lock.acquireRead();
    try {
      const data = this.rules.get(ruleId);
      if (data) {
        // Move to front (most recently used)
        this.moveToFront(ruleId);
      }
      return data || null;
    } finally {
      this.lock.releaseRead();
    }
  }

  /**
   * Set rule data with metadata and LRU management
   */
  async set(ruleId: string, data: Buffer, metadata: MinimalRuleMetadata): Promise<void> {
    await this.lock.acquireWrite();
    try {
      // Check if we need to evict
      if (this.rules.size >= this.maxSize && !this.rules.has(ruleId)) {
        this.evictLRU();
      }

      // Remove existing entry if updating
      if (this.rules.has(ruleId)) {
        this.removeFromTagIndex(ruleId);
      }

      // Add/update rule
      this.rules.set(ruleId, data);
      this.metadata.set(ruleId, metadata);
      
      // Update tag index
      this.addToTagIndex(ruleId, metadata.tags);
      
      // Update LRU
      this.moveToFront(ruleId);
    } finally {
      this.lock.releaseWrite();
    }
  }

  /**
   * Get rule metadata by ID
   */
  async getMetadata(ruleId: string): Promise<MinimalRuleMetadata | null> {
    await this.lock.acquireRead();
    try {
      return this.metadata.get(ruleId) || null;
    } finally {
      this.lock.releaseRead();
    }
  }

  /**
   * Get multiple rules by IDs
   */
  async getMultiple(ruleIds: string[]): Promise<Map<string, Buffer>> {
    await this.lock.acquireRead();
    try {
      const result = new Map<string, Buffer>();
      for (const ruleId of ruleIds) {
        const data = this.rules.get(ruleId);
        if (data) {
          result.set(ruleId, data);
          // Move to front for each accessed rule
          this.moveToFront(ruleId);
        }
      }
      return result;
    } finally {
      this.lock.releaseRead();
    }
  }

  /**
   * Set multiple rules at once
   */
  async setMultiple(rules: Map<string, { data: Buffer; metadata: MinimalRuleMetadata }>): Promise<void> {
    await this.lock.acquireWrite();
    try {
      for (const [ruleId, { data, metadata }] of rules) {
        // Check if we need to evict
        if (this.rules.size >= this.maxSize && !this.rules.has(ruleId)) {
          this.evictLRU();
        }

        // Remove existing entry if updating
        if (this.rules.has(ruleId)) {
          this.removeFromTagIndex(ruleId);
        }

        // Add/update rule
        this.rules.set(ruleId, data);
        this.metadata.set(ruleId, metadata);
        
        // Update tag index
        this.addToTagIndex(ruleId, metadata.tags);
        
        // Update LRU
        this.moveToFront(ruleId);
      }
    } finally {
      this.lock.releaseWrite();
    }
  }

  /**
   * Get rules by tags with fast lookup
   */
  async getRulesByTags(tags: string[]): Promise<string[]> {
    await this.lock.acquireRead();
    try {
      if (tags.length === 0) {
        return [];
      }

      // Get intersection of all tag sets
      let result: Set<string> | null = null;
      
      for (const tag of tags) {
        const ruleIds = this.tagIndex.get(tag);
        if (!ruleIds || ruleIds.size === 0) {
          return []; // If any tag has no rules, intersection is empty
        }
        
        if (result === null) {
          result = new Set(ruleIds);
        } else {
          // Intersection with existing result
          const resultArray: string[] = Array.from(result);
          result = new Set(resultArray.filter((id: string) => ruleIds.has(id)));
        }
        
        if (result.size === 0) {
          return []; // Early exit if intersection becomes empty
        }
      }

      return result ? Array.from(result) : [];
    } finally {
      this.lock.releaseRead();
    }
  }

  /**
   * Check if rule version is current
   */
  async isVersionCurrent(ruleId: string, version: string): Promise<boolean> {
    await this.lock.acquireRead();
    try {
      const metadata = this.metadata.get(ruleId);
      return metadata ? metadata.version === version : false;
    } finally {
      this.lock.releaseRead();
    }
  }

  /**
   * Invalidate (remove) a specific rule
   */
  async invalidate(ruleId: string): Promise<void> {
    await this.lock.acquireWrite();
    try {
      if (this.rules.has(ruleId)) {
        // Remove from tag index first (needs metadata)
        this.removeFromTagIndex(ruleId);
        
        // Remove from all data structures
        this.rules.delete(ruleId);
        this.metadata.delete(ruleId);
        this.removeFromLRU(ruleId);
      }
    } finally {
      this.lock.releaseWrite();
    }
  }

  /**
   * Clear all cached rules
   */
  async clear(): Promise<void> {
    await this.lock.acquireWrite();
    try {
      this.rules.clear();
      this.metadata.clear();
      this.tagIndex.clear();
      this.lruNodes.clear();
      
      // Reset LRU list
      this.head.next = this.tail;
      this.tail.prev = this.head;
    } finally {
      this.lock.releaseWrite();
    }
  }

  /**
   * Get all metadata for available rules
   */
  async getAllMetadata(): Promise<Map<string, MinimalRuleMetadata>> {
    await this.lock.acquireRead();
    try {
      return new Map(this.metadata);
    } finally {
      this.lock.releaseRead();
    }
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.rules.size;
  }

  /**
   * Get maximum cache size
   */
  get maxCacheSize(): number {
    return this.maxSize;
  }

  // Private LRU management methods

  private moveToFront(ruleId: string): void {
    let node = this.lruNodes.get(ruleId);
    
    if (!node) {
      // Create new node
      node = new LRUNode(ruleId);
      this.lruNodes.set(ruleId, node);
    } else {
      // Remove from current position
      this.removeNodeFromList(node);
    }
    
    // Add to front
    this.addNodeToFront(node);
  }

  private removeFromLRU(ruleId: string): void {
    const node = this.lruNodes.get(ruleId);
    if (node) {
      this.removeNodeFromList(node);
      this.lruNodes.delete(ruleId);
    }
  }

  private evictLRU(): void {
    // Remove least recently used (tail.prev)
    const lru = this.tail.prev;
    if (lru && lru !== this.head) {
      const ruleId = lru.key;
      
      // Remove from tag index first (needs metadata)
      this.removeFromTagIndex(ruleId);
      
      // Remove from all data structures
      this.rules.delete(ruleId);
      this.metadata.delete(ruleId);
      this.removeNodeFromList(lru);
      this.lruNodes.delete(ruleId);
    }
  }

  private addNodeToFront(node: LRUNode): void {
    node.prev = this.head;
    node.next = this.head.next;
    
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private removeNodeFromList(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  private addToTagIndex(ruleId: string, tags: string[]): void {
    for (const tag of tags) {
      let ruleIds = this.tagIndex.get(tag);
      if (!ruleIds) {
        ruleIds = new Set();
        this.tagIndex.set(tag, ruleIds);
      }
      ruleIds.add(ruleId);
    }
  }

  private removeFromTagIndex(ruleId: string): void {
    const metadata = this.metadata.get(ruleId);
    if (metadata) {
      for (const tag of metadata.tags) {
        const ruleIds = this.tagIndex.get(tag);
        if (ruleIds) {
          ruleIds.delete(ruleId);
          if (ruleIds.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }
  }
}