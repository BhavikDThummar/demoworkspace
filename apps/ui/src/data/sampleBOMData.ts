import { IBOMItem } from '../types/BOMTypes';

export const sampleBOMData: IBOMItem[] = [
  {
    lineID: '001',
    custPN: 'CUST-001',
    qpa: 2,
    refDesig: 'R1, R2',
    uomID: 'EACH',
    mfgPNDescription: 'Resistor 10K Ohm',
    mfgCode: 'YAGEO',
    mfgPN: 'RC0603FR-0710KL',
    description: '10K Ohm Resistor',
    mountingtypes: 'SMD',
    functionaltypes: 'Passive'
  },
  {
    lineID: '002',
    custPN: 'CUST-002',
    qpa: 1,
    refDesig: 'C1',
    uomID: 'EACH',
    mfgPNDescription: 'Capacitor 100nF',
    mfgCode: 'MURATA',
    mfgPN: 'GRM188R71H104KA93D',
    description: '100nF Ceramic Capacitor',
    mountingtypes: 'SMD',
    functionaltypes: 'Passive'
  },
  {
    lineID: '003',
    custPN: 'CUST-003',
    qpa: 3,
    refDesig: 'R3, R4, R5',
    uomID: 'EACH',
    mfgPNDescription: 'Resistor 1K Ohm',
    mfgCode: 'YAGEO',
    mfgPN: 'RC0603FR-071KL',
    description: '1K Ohm Resistor',
    mountingtypes: 'SMD',
    functionaltypes: 'Passive'
  },
  {
    lineID: '004',
    custPN: 'CUST-004',
    qpa: 0, // This should fail validation - QPA must be > 0
    refDesig: 'U1',
    uomID: 'EACH',
    mfgPNDescription: 'Microcontroller',
    mfgCode: 'ATMEL',
    mfgPN: 'ATMEGA328P-AU',
    description: 'AVR Microcontroller',
    mountingtypes: 'SMD',
    functionaltypes: 'Active'
  },
  {
    lineID: '005',
    custPN: 'CUST-005',
    qpa: 1,
    refDesig: '', // This should fail validation - RefDesig required for EACH UOM
    uomID: 'EACH',
    mfgPNDescription: 'LED Red',
    mfgCode: 'OSRAM',
    mfgPN: 'LR3333-Q2R2-1',
    description: 'Red LED',
    mountingtypes: 'SMD',
    functionaltypes: 'Active'
  },
  {
    lineID: '006',
    custPN: 'CUST-006',
    qpa: 2,
    refDesig: 'R1, R6', // This should fail validation - R1 is already used in line 001
    uomID: 'EACH',
    mfgPNDescription: 'Resistor 4.7K Ohm',
    mfgCode: 'YAGEO',
    mfgPN: 'RC0603FR-074K7L',
    description: '4.7K Ohm Resistor',
    mountingtypes: 'SMD',
    functionaltypes: 'Passive'
  },
  {
    lineID: '007',
    custPN: 'CUST-007',
    qpa: 1,
    refDesig: 'Q1, Q2, Q3', // This should fail validation - QPA (1) doesn't match RefDesig count (3)
    uomID: 'EACH',
    mfgPNDescription: 'Transistor NPN',
    mfgCode: 'ON_SEMI',
    mfgPN: 'MMBT3904LT1G',
    description: 'NPN Transistor',
    mountingtypes: 'SMD',
    functionaltypes: 'Active'
  },
  {
    lineID: '008',
    custPN: 'CUST-008',
    qpa: 100,
    refDesig: '', // This is OK for non-EACH UOM
    uomID: 'GRAM',
    mfgPNDescription: 'Solder Paste',
    mfgCode: 'KESTER',
    mfgPN: 'EP256',
    description: 'Lead-free Solder Paste',
    mountingtypes: 'N/A',
    functionaltypes: 'Material'
  }
];