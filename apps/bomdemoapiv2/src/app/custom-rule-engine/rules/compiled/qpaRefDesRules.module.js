function parseRefDesig(refDesig) {
    if (!refDesig || typeof refDesig !== 'string')
        return [];
    return refDesig.replace(/\s+/g, '').split(',').filter(Boolean);
}
function normalizeQPA(qpa) {
    if (typeof qpa === 'number')
        return qpa;
    const parsed = parseFloat(String(qpa));
    return isNaN(parsed) ? 0 : parsed;
}
function createError(field, message, itemId, severity = 'error') {
    return { field, message, severity, itemId };
}
export const transformParseAndInitialize = {
    name: 'transform_parse_and_initialize',
    description: 'Parse refDesig arrays and prepare data for validation',
    priority: 1,
    enabled: true,
    tags: ['transform', 'validation', 'qpa', 'refDesig'],
    transform: (context) => {
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
export const validateQpaRefDesRules = {
    name: 'validate_qpa_refdes_rules',
    description: 'Comprehensive validation of QPA vs RefDes relationships with all business rules',
    priority: 2,
    enabled: true,
    tags: ['validation', 'qpa', 'refDesig'],
    validate: (context) => {
        const { item } = context;
        const errors = [];
        const refDesigCount = item.cmHidden?.refDesigCount || 0;
        const dnpDesigCount = item.cmHidden?.dnpDesigCount || 0;
        const maxRefDesAllow = 2;
        let qpaDesignatorStep = item.cmHidden?.qpaDesignatorStep;
        let dnpQPARefDesStep = item.cmHidden?.dnpQPARefDesStep;
        if (!item.lineID || item.lineID <= 0) {
            errors.push(createError('lineID', 'Line ID is required and must be greater than 0', item.lineID || 0));
            return errors;
        }
        if (refDesigCount > maxRefDesAllow) {
            errors.push(createError('qpa', `RefDesig count (${refDesigCount}) exceeds maximum allowed (${maxRefDesAllow})`, item.lineID));
            qpaDesignatorStep = 7;
        }
        else if (dnpDesigCount > maxRefDesAllow) {
            errors.push(createError('DNP QPA', `DNP Designator count (${dnpDesigCount}) exceeds maximum allowed (${maxRefDesAllow})`, item.lineID));
            dnpQPARefDesStep = 7;
        }
        else if (+item.uomID === -1) {
            const qpaValue = normalizeQPA(item.qpa || 0);
            const dnpQtyValue = normalizeQPA(item.dnpQty || 0);
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
            else if (refDesigCount !== qpaValue && qpaValue > 0) {
                errors.push(createError('qpa', `QPA (${qpaValue}) must match RefDesig count (${refDesigCount}) when UOM is EACH`, item.lineID));
                qpaDesignatorStep = 3;
            }
            else if (dnpDesigCount !== dnpQtyValue && dnpQtyValue > 0) {
                errors.push(createError('dnpQty', `DNP Quantity (${dnpQtyValue}) must match DNP Designator count (${dnpDesigCount}) when UOM is EACH`, item.lineID));
                dnpQPARefDesStep = 3;
            }
            else if (refDesigCount === qpaValue &&
                dnpDesigCount === dnpQtyValue &&
                qpaValue > 0 &&
                dnpQtyValue > 0) {
                qpaDesignatorStep = 1;
                dnpQPARefDesStep = 1;
            }
        }
        if (item.cmHidden) {
            item.cmHidden.qpaDesignatorStep = qpaDesignatorStep;
            item.cmHidden.dnpQPARefDesStep = dnpQPARefDesStep;
        }
        return errors;
    }
};
export const qpaRefDesRules = [
    transformParseAndInitialize,
    validateQpaRefDesRules,
];
export default qpaRefDesRules;
