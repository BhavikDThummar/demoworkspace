/**
 * BOM Item interface based on the QPA vs RefDes rule schema
 */
export interface IBOMItem {
  lineID: number;
  custPN: string;
  qpa: number;
  refDesig: string;
  refDesigCount: number;
  dnpQty: string | number;
  dnpDesig: string;
  dnpDesigCount: number;
  uomID: string;
  mfgPNDescription: string;
  mfgCode: string;
  mfgPN: string;
  description: string;
  mountingtypes: string;
  functionaltypes: string;
  field1: string;
  field2: string;
  field3: string;
  field4: string;
  field5: string;
  field6: string;
  field7: string;
}

/**
 * Configuration data for BOM validation rules
 */
export interface IBOMConfigData {
  _OddelyRefDesList: string[];
  maxREFDESAllow: number;
  _UOM: {
    EACH: string;
  };
}

/**
 * Validation flags for BOM processing
 */
export interface IBOMValidationFlags {
  qpaDesignatorStep?: string;
  dnpQPARefDesStep?: string;
  qpaDesignatorStepError?: string | null;
  dnpQPARefDesError?: string | null;
  test?: string;
}

/**
 * Other validation results
 */
export interface IBOMOtherValidation {
  isFailedMaxREFDESAllow?: string;
}

/**
 * Complete BOM validation request payload
 */
export interface IBOMValidationRequest {
  bomItem: IBOMItem;
  configData: IBOMConfigData;
  validationFlags: IBOMValidationFlags;
  otherValidation: IBOMOtherValidation;
}

/**
 * BOM validation response
 */
export interface IBOMValidationResponse {
  success: boolean;
  validationFlags: IBOMValidationFlags;
  otherValidation: IBOMOtherValidation;
  executionTime?: number;
  message?: string;
  error?: string;
}
