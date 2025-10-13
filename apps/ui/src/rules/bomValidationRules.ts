import { Rule, ValidationError } from '@org/cm-rule-engine';
import { IBOMItem } from '../types/BOMTypes';
import { BOMUtils } from '../utils/BOMUtils';

export const bomValidationRules: Rule<IBOMItem>[] = [
  {
    name: 'transform_refdesig_array',
    description: 'Convert refDesig to array format for easy counting',
    priority: 1,
    enabled: true,
    tags: ['transform', 'refDesig'],
    transform: (context) => {
      const { item } = context;
      return {
        ...item,
        cmHidden: {
          ...(item.cmHidden || {}),
          refDesigParsed: BOMUtils.parseRefDesig(item.refDesig),
        },
      };
    },
  },
  {
    name: 'validate_max_refdesig',
    description: 'Ensure refDesig count does not exceed maximum',
    priority: 2,
    enabled: true,
    tags: ['validation', 'refDesig'],
    validate: (context) => {
      const { item } = context;
      const refDesigArray = BOMUtils.parseRefDesig(item.refDesig);
      const errors: ValidationError[] = [];

      if (refDesigArray.length > 2) {
        // default maxRefDesigCount
        errors.push({
          field: 'refDesig',
          message: `RefDesig count (${refDesigArray.length}) exceeds maximum allowed (2)`,
          severity: 'error',
          itemId: item.lineID,
        });
      }

      return errors;
    },
  },
  {
    name: 'validate_qpa_required',
    description: 'Ensure QPA is always provided',
    priority: 3,
    enabled: true,
    tags: ['validation', 'qpa'],
    validate: (context) => {
      const { item } = context;
      const errors: ValidationError[] = [];
      const qpaValue = BOMUtils.normalizeQPA(item.qpa);

      if (!item.qpa || qpaValue <= 0) {
        errors.push({
          field: 'qpa',
          message: 'QPA is required and must be greater than 0',
          severity: 'error',
          itemId: item.lineID,
        });
      }

      return errors;
    },
  },
  {
    name: 'validate_each_uom',
    description: 'Validate EACH UOM requirements',
    priority: 4,
    enabled: true,
    tags: ['validation', 'qpa', 'refDesig', 'uom'],
    validate: (context) => {
      const { item } = context;
      const errors: ValidationError[] = [];

      if (+item.uomID === -1) {
        const refDesigArray = BOMUtils.parseRefDesig(item.refDesig);
        const qpaValue = BOMUtils.normalizeQPA(item.qpa);

        if (!item.qpa || qpaValue <= 0) {
          errors.push({
            field: 'qpa',
            message: 'QPA is required when UOM is EACH',
            severity: 'error',
            itemId: item.lineID,
          });
        }

        if (!refDesigArray.length) {
          errors.push({
            field: 'refDesig',
            message: 'RefDesig is required when UOM is EACH',
            severity: 'error',
            itemId: item.lineID,
          });
        }

        if (refDesigArray.length > 0 && qpaValue > 0) {
          const actualRefDesigCount = refDesigArray.length;
          if (qpaValue !== actualRefDesigCount) {
            errors.push({
              field: 'qpa',
              message: `QPA (${qpaValue}) must match with RefDesig count (${actualRefDesigCount})`,
              severity: 'error',
              itemId: item.lineID,
            });
          }
        }
      }

      return errors;
    },
  },
  {
    name: 'validate_unique_refdesig',
    description: 'Ensure refDesig values are unique across BOM',
    priority: 5,
    enabled: true,
    tags: ['validation', 'refDesig', 'uniqueness'],
    validate: (context) => {
      const { item, allItems } = context;
      const errors: ValidationError[] = [];
      const currentRefDesigs = BOMUtils.parseRefDesig(item.refDesig);
      const otherRefDesigs = new Set<string>();
      const duplicateMap = new Map<string, number[]>(); // refDesig -> lineIDs

      allItems.forEach((otherItem) => {
        if (otherItem.lineID === item.lineID) return;

        const otherRefDesigArray = BOMUtils.parseRefDesig(otherItem.refDesig);
        otherRefDesigArray.forEach((refDes) => {
          if (otherRefDesigs.has(refDes)) {
            if (!duplicateMap.has(refDes)) {
              duplicateMap.set(refDes, []);
            }
            duplicateMap.get(refDes)?.push(otherItem.lineID);
          }
          otherRefDesigs.add(refDes);
        });
      });

      currentRefDesigs.forEach((refDes) => {
        if (otherRefDesigs.has(refDes)) {
          const conflictingLines = duplicateMap.get(refDes) || [];
          errors.push({
            field: 'refDesig',
            message: `RefDesig "${refDes}" is already used in line(s): ${conflictingLines.join(
              ', ',
            )}`,
            severity: 'error',
            itemId: item.lineID,
          });
        }
      });

      return errors;
    },
  },
  {
    name: 'validate_special_characters',
    description: 'Validate special characters in refDesig',
    priority: 6,
    enabled: false,
    tags: ['validation', 'refDesig', 'characters'],
    validate: (context) => {
      const { item } = context;
      const errors: ValidationError[] = [];
      const refDesigArray = BOMUtils.parseRefDesig(item.refDesig);
      const allowedSpecialChars = ['-', '_', '.'];
      const oddlyNamedRefDesPatterns = [/^TP\d+$/i, /^J\d+[-_]\d+$/i, /^U\d+[A-Z]$/i];

      refDesigArray.forEach((refDes) => {
        const isOddlyNamed = BOMUtils.isOddlyNamedRefDes(refDes, oddlyNamedRefDesPatterns);
        if (!isOddlyNamed && BOMUtils.hasSpecialCharacters(refDes, allowedSpecialChars)) {
          errors.push({
            field: 'refDesig',
            message: `RefDesig "${refDes}" contains disallowed special characters. Allowed: ${allowedSpecialChars.join(
              ', ',
            )}`,
            severity: 'error',
            itemId: item.lineID,
          });
        }
      });

      return errors;
    },
  },
];
