/**
 * Batch Data Rules Module - BOM-specific batch data fetching rules
 * This file can be compiled to JavaScript and served to the UI
 *
 * IMPORTANT: Keep this file free of Node.js-specific imports for UI compatibility
 * For API-side usage, use the companion service file
 *
 * UI Usage: Rules receive pre-fetched data via context.metadata.batchData
 * API Usage: Rules make actual database/API calls (handled by service layer)
 */

// Import types - these will be replaced during compilation for UI
import { Rule, RuleContext } from '@org/cm-rule-engine';

// Type definition for BOM items (duplicated to avoid import issues)
interface IBOMItem {
  lineID: number;
  custPN?: string;
  mfgPN?: string;
  description?: string;
  qpa?: number | string;
  uomID?: string;
  refDesig?: string;
  dnpDesig?: string;
  dnpQty?: number | string;
  cmHidden?: {
    refDesigParsed?: string[];
    dnpDesigParsed?: string[];
    refDesigCount?: number;
    dnpDesigCount?: number;
    qpaDesignatorStep?: number;
    dnpQPARefDesStep?: number;
    // Batch data fields
    uomId_fromDB?: string;
    uomLookupResult?: {
      id: number | null;
      unitName: string | null;
      found: boolean;
    };
    apiEnrichment?: {
      processedAt: string;
      batchInfo: string;
      apiVersion: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Batch Data Context for UI rules
 * UI rules will receive pre-fetched data through this context
 */
interface BatchDataContext {
  batchId: string;
  allItems: IBOMItem[];
  // Pre-fetched data from API calls
  uomData?: {
    id: number;
    unitName: string;
  } | null;
  uomLookupData?: Array<{
    id: number;
    unitName: string;
  }>;
  externalApiData?: {
    timestamp: string;
    batchSize: number;
    apiVersion: string;
  };
  [key: string]: unknown;
}

/**
 * Rule: UOM Enrichment (UI Version)
 * For UI: Uses pre-fetched data from API
 * For API: Will be enhanced with actual database calls
 */
export const uomEnrichmentRule: Rule<IBOMItem> = {
  name: 'uom_enrichment',
  description: 'Enrich BOM items with UOM data from database (id = -1)',
  priority: 1,
  enabled: true,
  tags: ['batch-data', 'uom', 'database'],

  transform: (context: RuleContext<IBOMItem>): IBOMItem => {
    const { item } = context;

    // Initialize cmHidden if it doesn't exist
    if (!item.cmHidden) {
      item.cmHidden = {};
    }

    // For UI: Get pre-fetched data from metadata
    const batchData = context.metadata?.batchData as BatchDataContext;

    if (batchData?.uomData) {
      item.cmHidden.uomId_fromDB = batchData.uomData.unitName || 'unknown';

      // Log only for first few items to avoid spam
      if (context.index < 3) {
        console.log(
          `✅ Item ${context.index + 1}: Added uomId_fromDB = "${item.cmHidden.uomId_fromDB}"`,
        );
      }
    } else {
      item.cmHidden.uomId_fromDB = 'not-found';

      if (context.index < 3) {
        console.log(`❌ Item ${context.index + 1}: UOM not found, set uomId_fromDB = "not-found"`);
      }
    }

    return item;
  },
};

/**
 * Rule: UOM Lookup Enrichment (UI Version)
 * Creates lookup map for UOM data
 */
export const uomLookupRule: Rule<IBOMItem> = {
  name: 'uom_lookup_enrichment',
  description: 'Create UOM lookup for BOM items',
  priority: 2,
  enabled: true,
  tags: ['batch-data', 'uom', 'lookup'],

  transform: (context: RuleContext<IBOMItem>): IBOMItem => {
    const { item } = context;

    if (!item.cmHidden) {
      item.cmHidden = {};
    }

    // For UI: Get pre-fetched lookup data
    const batchData = context.metadata?.batchData as BatchDataContext;

    if (batchData?.uomLookupData && item.uomID) {
      const uomRecord = batchData.uomLookupData.find((uom) => uom.id.toString() === item.uomID);

      if (uomRecord) {
        item.cmHidden.uomLookupResult = {
          id: uomRecord.id,
          unitName: uomRecord.unitName,
          found: true,
        };
      } else {
        item.cmHidden.uomLookupResult = {
          id: null,
          unitName: null,
          found: false,
        };
      }
    } else {
      item.cmHidden.uomLookupResult = {
        id: null,
        unitName: null,
        found: false,
      };
    }

    return item;
  },
};

/**
 * Rule: External API Enrichment (UI Version)
 * Adds data from external API calls
 */
export const apiEnrichmentRule: Rule<IBOMItem> = {
  name: 'external_api_enrichment',
  description: 'Enrich BOM items with external API data',
  priority: 3,
  enabled: true,
  tags: ['batch-data', 'api', 'external'],

  transform: (context: RuleContext<IBOMItem>): IBOMItem => {
    const { item } = context;

    if (!item.cmHidden) {
      item.cmHidden = {};
    }

    // For UI: Get pre-fetched API data
    const batchData = context.metadata?.batchData as BatchDataContext;

    if (batchData?.externalApiData) {
      item.cmHidden.apiEnrichment = {
        processedAt: batchData.externalApiData.timestamp,
        batchInfo: `Processed in batch of ${batchData.externalApiData.batchSize} items`,
        apiVersion: batchData.externalApiData.apiVersion,
      };
    }

    return item;
  },
};

/**
 * Export all batch data rules as an array
 */
export const batchDataRules: Rule<IBOMItem>[] = [
  uomEnrichmentRule,
  uomLookupRule,
  apiEnrichmentRule,
];

/**
 * Default export for convenience
 */
export default batchDataRules;
