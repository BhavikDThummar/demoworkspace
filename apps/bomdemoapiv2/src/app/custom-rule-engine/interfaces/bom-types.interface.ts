/**
 * BOM Types for Custom Rule Engine
 */

export interface IBOMItem {
  lineID: number;
  custPN?: string;
  qpa: number;
  refDesig: string;
  uomID: string;
  dbUomId?: number;
  dnpQty?: number | string;
  dnpDesig?: string;
  mfgPNDescription: string;
  mfgCode: string;
  mfgPN: string;
  description: string;
  mountingtypes: string;
  functionaltypes: string;
  cmHidden?: Record<string, any>;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  itemId: number;
}