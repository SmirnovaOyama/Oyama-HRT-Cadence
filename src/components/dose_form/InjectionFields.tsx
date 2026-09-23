import React from 'react';
import { Ester, isTestosteroneEster } from '../../../logic';
import AmountSection, { AmountBasis } from './AmountSection';

interface InjectionFieldsProps {
    ester: Ester;
    rawDose: string;
    e2Dose: string;
    onRawChange: (val: string) => void;
    onE2Change: (val: string) => void;
    basis: AmountBasis;
    onBasisChange: (basis: AmountBasis) => void;
}

/** Injections step by 0.5 mg of estradiol ester, or 5 mg of testosterone. */
const InjectionFields: React.FC<InjectionFieldsProps> = (props) => (
    <AmountSection {...props} step={isTestosteroneEster(props.ester) ? 5 : 0.5} />
);

export default InjectionFields;
