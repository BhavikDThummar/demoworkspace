/**
 * QPA RefDes Rules Module - Exportable as ES Module
 * This file can be compiled to JavaScript and served to the UI
 * 
 * IMPORTANT: Keep this file free of Node.js-specific imports
 * It should be compatible with both Node.js and browser environments
 */

import { Rule, RuleContext, ValidationError } from '@org/cm-rule-engine';

// Type definition for BOM items (duplicated to avoid import issues)
interface IBOMItem {
  lineID: number;
  custPN?: string | null;
  qpa: number;
  refDesig: string;
  dnpQty?: number;
  dnpDesig?: string;
  uomID: string | number;
  dbUomId?: number;
  mfgPNDescription: string;
  mfgCode: string;
  mfgCodeID?: number;
  mfgPN: string;
  mfgPNID?: number;
  description: string;
  mountingtypes?: string;
  functionaltypes?: string;
  cmHidden?: Record<string, any>;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
}



/** Utility: Parse RefDesig string into array */
function parseRefDesig(refDesig: string): string[] {
  if (!refDesig || typeof refDesig !== 'string') return [];
  return refDesig.replace(/\s+/g, '').split(',').filter(Boolean);
}

/** Utility: Normalize QPA value to number */
function normalizeQPA(qpa: number | string): number {
  if (typeof qpa === 'number') return qpa;
  const parsed = parseFloat(String(qpa));
  return isNaN(parsed) ? 0 : parsed;
}

/** Utility: Create validation error */
function createError(
  field: string,
  message: string,
  itemId: number,
  severity: 'error' | 'warning' = 'error'
): ValidationError {
  return { field, message, severity, itemId };
}

/**
 * Rule 1: Transform - Parse and Initialize
 * Parse refDesig arrays and prepare data for validation
 */
export const transformParseAndInitialize: Rule<IBOMItem> = {
  name: 'transform_parse_and_initialize',
  description: 'Parse refDesig arrays and prepare data for validation',
  priority: 1,
  enabled: true,
  tags: ['transform', 'validation', 'qpa', 'refDesig'],
  
  transform: (context: RuleContext<IBOMItem>): IBOMItem => {
    const { item } = context;
    const refDesigArray = parseRefDesig(item.refDesig || '');
    const dnpDesigArray = parseRefDesig(item.dnpDesig || '');
    
    item.cmHidden = {
      ...(item.cmHidden || {}),
      refDesigParsed: refDesigArray,
      dnpDesigParsed: dnpDesigArray,
      refDesigCount: refDesigArray.length,
      dnpDesigCount: dnpDesigArray.length,
    };

    return item;
  }
};

/**
 * Rule 2: Validate - QPA RefDes Rules
 * Comprehensive validation of QPA vs RefDes relationships
 */
export const validateQpaRefDesRules: Rule<IBOMItem> = {
  name: 'validate_qpa_refdes_rules',
  description: 'Comprehensive validation of QPA vs RefDes relationships with all business rules',
  priority: 2,
  enabled: true,
  tags: ['validation', 'qpa', 'refDesig'],
  
  validate: (context: RuleContext<IBOMItem>): ValidationError[] => {
    /*
      Validation Steps:
      1 = Verified
      2 = Change
      3 = Mismatch
      4 = Duplicate
      5 = Invalid
      6 = Require
      7 = Exceeds Maximum
    */
    const { item } = context;
    const errors: ValidationError[] = [];

    // Get parsed data from cmHidden
    const refDesigCount = item.cmHidden?.refDesigCount || 0;
    const dnpDesigCount = item.cmHidden?.dnpDesigCount || 0;
    const maxRefDesAllow = 2; // Configuration value

    // Initialize validation state variables
    let qpaDesignatorStep = item.cmHidden?.qpaDesignatorStep;
    let dnpQPARefDesStep = item.cmHidden?.dnpQPARefDesStep;

    // Rule 1: Validate line ID
    if (!item.lineID || item.lineID <= 0) {
      errors.push(createError('lineID', 'Line ID is required and must be greater than 0', item.lineID || 0));
      return errors;
    }

    // Rule 2: Validate RefDesig count max
    if (refDesigCount > maxRefDesAllow) {
      errors.push(createError('qpa', `RefDesig count (${refDesigCount}) exceeds maximum allowed (${maxRefDesAllow})`, item.lineID));
      qpaDesignatorStep = 7;
    }
    // Rule 3: Validate DNP Designator count max
    else if (dnpDesigCount > maxRefDesAllow) {
      errors.push(createError('DNP QPA', `DNP Designator count (${dnpDesigCount}) exceeds maximum allowed (${maxRefDesAllow})`, item.lineID));
      dnpQPARefDesStep = 7;
    }
    // EACH UOM specific validations
    else if (+item.uomID === -1) {
      const qpaValue = normalizeQPA(item.qpa || 0);
      const dnpQtyValue = normalizeQPA(item.dnpQty || 0);

      // Rule 5: Require QPA and DNP when UOM is EACH
      if (qpaValue <= 0 && dnpQtyValue <= 0) {
        if (qpaValue <= 0) {
          errors.push(createError('qpa', 'QPA is required when UOM is EACH', item.lineID));
          qpaDesignatorStep = 6;
        }

        if (dnpQtyValue <= 0) {
          errors.push(createError('dnpQty', 'DNP Quantity is required when UOM is EACH', item.lineID));
          dnpQPARefDesStep = 6;
        }
      }
      // Rule 6: QPA must match RefDesig count
      else if (refDesigCount !== qpaValue && qpaValue > 0) {
        errors.push(createError('qpa', `QPA (${qpaValue}) must match RefDesig count (${refDesigCount}) when UOM is EACH`, item.lineID));
        qpaDesignatorStep = 3;
      }
      // Rule 7: DNP Quantity must match DNP Designator count
      else if (dnpDesigCount !== dnpQtyValue && dnpQtyValue > 0) {
        errors.push(createError('dnpQty', `DNP Quantity (${dnpQtyValue}) must match DNP Designator count (${dnpDesigCount}) when UOM is EACH`, item.lineID));
        dnpQPARefDesStep = 3;
      }
      // Rule 8: Everything matches - verified
      else if (
        refDesigCount === qpaValue &&
        dnpDesigCount === dnpQtyValue &&
        qpaValue > 0 &&
        dnpQtyValue > 0
      ) {
        qpaDesignatorStep = 1;
        dnpQPARefDesStep = 1;
      }
    }

    // Update validation steps
    if (item.cmHidden) {
      item.cmHidden.qpaDesignatorStep = qpaDesignatorStep;
      item.cmHidden.dnpQPARefDesStep = dnpQPARefDesStep;
    }

    return errors;
  }
};

/**
 * Export all rules as an array
 * This is what the UI will import
 */
export const qpaRefDesRules: Rule<IBOMItem>[] = [
  transformParseAndInitialize,
  validateQpaRefDesRules,
];

/**
 * Default export for convenience
 */
export default qpaRefDesRules;
