/**
 * Hook for batch data processing
 * Provides utilities for calling the batch data API endpoints
 */

import { useState, useCallback } from 'react';

interface BOMItem {
  lineID: number;
  custPN?: string;
  description?: string;
  qpa?: number | string;
  uomID?: string;
  cmHidden?: {
    uomId_fromDB?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface BatchDataOptions {
  continueOnError?: boolean;
  includeBatchDataRules?: boolean;
  includeValidationRules?: boolean;
}

interface BatchDataResult {
  items: BOMItem[];
  summary: {
    totalItems: number;
    enrichedItems: number;
    executionTime: number;
    rulesExecuted: number;
    enrichmentRate: string;
  };
  performance: {
    itemsPerSecond: number;
    avgTimePerItem: string;
    databaseCallsEstimate: string;
  };
  errors: Array<{ field: string; message: string; itemId: number }>;
  warnings: Array<{ field: string; message: string; itemId: number }>;
}

interface UseBatchDataProcessingResult {
  processing: boolean;
  error: string | null;
  processBatchData: (items: BOMItem[], options?: BatchDataOptions) => Promise<BatchDataResult | null>;
  clearError: () => void;
}

const API_BASE_URL = 'https://localhost:8001/api';

export function useBatchDataProcessing(): UseBatchDataProcessingResult {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const processBatchData = useCallback(async (
    items: BOMItem[], 
    options: BatchDataOptions = {}
  ): Promise<BatchDataResult | null> => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/nestjs-rule-engine/process-with-batch-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: items,
          options: {
            continueOnError: true,
            includeBatchDataRules: true,
            includeValidationRules: false,
            ...options,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json();
      
      if (apiResponse.statusCode !== 200) {
        throw new Error(apiResponse.message || 'API request failed');
      }

      return apiResponse.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Batch data processing error:', err);
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    processing,
    error,
    processBatchData,
    clearError,
  };
}

/**
 * Hook for generating test BOM data
 */
export function useTestDataGenerator() {
  const generateTestItems = useCallback((count: number): BOMItem[] => {
    return Array.from({ length: count }, (_, index) => ({
      lineID: index + 1,
      custPN: `TEST-PART-${String(index + 1).padStart(6, '0')}`,
      qpa: Math.floor(Math.random() * 10) + 1,
      uomID: ['EACH', 'EA', 'PCS'][Math.floor(Math.random() * 3)],
      description: `Test component ${index + 1} - ${['Resistor', 'Capacitor', 'Inductor', 'IC'][Math.floor(Math.random() * 4)]}`,
    }));
  }, []);

  return { generateTestItems };
}