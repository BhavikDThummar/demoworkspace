export interface IBOMItem {
  lineID: number;
  custPN?: string;
  qpa?: number | string;
  refDesig?: string;
  uomID?: string | number;
  dnpQty?: number | string;
  dnpDesig?: string;
  mfgPNDescription?: string;
  mfgCode?: string;
  mfgPN?: string;
  description?: string;
  mountingtypes?: string;
  functionaltypes?: string;
  cmHidden?: {
    refDesigParsed?: string[];
    dnpDesigParsed?: string[];
    refDesigCount?: number;
    dnpDesigCount?: number;
    qpaDesignatorStep?: number;
    dnpQPARefDesStep?: number;
    [key: string]: unknown;
  };
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
  [key: string]: unknown;
}
