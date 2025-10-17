/**
 * BOM Types for Custom Rule Engine
 */

export interface IBOMItem {
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

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  itemId: number;
}