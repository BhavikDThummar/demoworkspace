export interface IBOMItem {
  lineID: string;
  custPN?: string;
  qpa: string | number;
  refDesig: string;
  uomID: string;
  mfgPNDescription: string;
  mfgCode: string;
  mfgPN: string;
  description: string;
  mountingtypes: string;
  functionaltypes: string;
  cmHidden?: Record<string, any>;
}