import React from 'react';
import { Ester } from '../../../logic';
import AmountSection, { AmountBasis } from './AmountSection';

interface OralFieldsProps {
    ester: Ester;
    rawDose: string;
    e2Dose: string;
    onRawChange: (val: string) => void;
    onE2Change: (val: string) => void;
    basis: AmountBasis;
    onBasisChange: (basis: AmountBasis) => void;
}

/** Pills step by 0.5 mg; cyproterone by a quarter of a 25 mg tablet. */
const OralFields: React.FC<OralFieldsProps> = (props) => (
    <AmountSection {...props} step={props.ester === Ester.CPA ? 6.25 : 0.5} />
);

export default OralFields;
