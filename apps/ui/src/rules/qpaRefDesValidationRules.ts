import { Rule, ValidationError } from '@org/cm-rule-engine';
import { BOMUtils } from './BOMUtils';
import { IBOMItem } from '../BOMDemoProps';
import { RuleContext } from '../../../../libs/cm-rule-engine/src';

export const qpaRefDesValidationRules: Rule<IBOMItem>[] = [
  {
    name: 'transform_parse_and_initialize',
    description: 'Parse refDesig arrays and prepare data for validation',
    priority: 1,
    enabled: true,
    tags: ['transform', 'validation', 'qpa', 'refDesig'],
    transform: (context) => {
      const { item } = context;
      const refDesigArray = BOMUtils.parseRefDesig(item.refDesig);
      const dnpDesigArray = BOMUtils.parseRefDesig(item.dnpDesig || '');
      item.cmHidden = {
        ...(item.cmHidden || {}),
        // Store parsed arrays and counts for reuse
        refDesigParsed: refDesigArray,
        dnpDesigParsed: dnpDesigArray,
        refDesigCount: refDesigArray.length,
        dnpDesigCount: dnpDesigArray.length,
      };

      return item;
    },
  },
  {
    name: 'validate_qpa_refdes_rules',
    description: 'Comprehensive validation of QPA vs RefDes relationships with all business rules',
    priority: 2,
    enabled: true,
    tags: ['validation', 'qpa', 'refDesig'],
    validate: (context) => {
      /*
        1 = Verified
        2 = Change
        3 = Mismatch
        4 = Duplicate
        5 = Invalid
        6 = Require
      */
      const { item } = context;
      const errors: ValidationError[] = [];

      // Get parsed data from cmHidden
      const refDesigCount = item.cmHidden?.refDesigCount || 0;
      const dnpDesigCount = item.cmHidden?.dnpDesigCount || 0;
      const maxRefDesAllow = 2; // configData.maxREFDESAllow equivalent

      // Initialize validation state variables
      let qpaDesignatorStep = item.cmHidden!.qpaDesignatorStep;
      let dnpQPARefDesStep = item.cmHidden!.dnpQPARefDesStep;

      // Rule 1: Validate line ID
      if (!item.lineID || item.lineID <= 0) {
        errors.push({
          field: 'lineID',
          message: 'Line ID is required and must be greater than 0',
          severity: 'error',
          itemId: item.lineID || 0,
        });
        return errors;
      }

      // Rule 2: Validate RefDesig count max
      if (refDesigCount > maxRefDesAllow) {
        errors.push({
          field: 'qpa',
          message: `RefDesig count (${refDesigCount}) exceeds maximum allowed (${maxRefDesAllow})`,
          severity: 'error',
          itemId: item.lineID,
        });
        qpaDesignatorStep = 7;
      }
      // Rule 3: Validate DNP Designator count max
      else if (dnpDesigCount > maxRefDesAllow) {
        errors.push({
          field: 'DNP QPA',
          message: `DNP Designator count (${dnpDesigCount}) exceeds maximum allowed (${maxRefDesAllow})`,
          severity: 'error',
          itemId: item.lineID,
        });
        dnpQPARefDesStep = 7;
      }
      // EACH UOM specific validations
      else if (+item.uomID === -1) {
        const qpaValue = BOMUtils.normalizeQPA(item.qpa);
        const dnpQtyValue = BOMUtils.normalizeQPA(item.dnpQty || 0);

        // Rule 5: Require QPA and DNP when UOM is EACH
        if (qpaValue <= 0 && dnpQtyValue <= 0) {
          if (qpaValue <= 0) {
            errors.push({
              field: 'qpa',
              message: 'QPA is required when UOM is EACH',
              severity: 'error',
              itemId: item.lineID,
            });
            qpaDesignatorStep = 6;
          }

          if (dnpQtyValue <= 0) {
            errors.push({
              field: 'dnpQty',
              message: 'DNP Quantity is required when UOM is EACH',
              severity: 'error',
              itemId: item.lineID,
            });
            dnpQPARefDesStep = 6;
          }
        }
        // Rule 6: QPA must match RefDesig count
        else if (refDesigCount !== qpaValue && qpaValue > 0) {
          errors.push({
            field: 'qpa',
            message: `QPA (${qpaValue}) must match RefDesig count (${refDesigCount}) when UOM is EACH`,
            severity: 'error',
            itemId: item.lineID,
          });
          qpaDesignatorStep = 3;
        }
        // Rule 7: DNP Quantity must match DNP Designator count
        else if (dnpDesigCount !== dnpQtyValue && dnpQtyValue > 0) {
          errors.push({
            field: 'dnpQty',
            message: `DNP Quantity (${dnpQtyValue}) must match DNP Designator count (${dnpDesigCount}) when UOM is EACH`,
            severity: 'error',
            itemId: item.lineID,
          });
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

      item.cmHidden!.qpaDesignatorStep = qpaDesignatorStep;
      item.cmHidden!.qpaDesignatorStep = dnpQPARefDesStep;

      return errors;
    },
  },
];
