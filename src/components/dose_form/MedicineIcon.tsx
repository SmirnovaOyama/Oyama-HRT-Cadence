import type { CSSProperties } from 'react';
import { Ester } from '../../../logic';
import { Molecule } from '../icons';
import { EstradiolIcon } from '../icons/EstradiolIcon';
import './MedicineIcon.css';

type Palette = readonly [ink: string, fill: string, accent: string, darkInk: string, darkFill: string, darkAccent: string];

// Color is decorative; the adjacent medicine name always identifies the option.
// Estradiol uses the owner-provided artwork; other medicines use an abstract molecule.
const MEDICINE_PALETTES: Record<Ester, Palette> = {
    [Ester.E2]: ['#BE2877', '#FFE0EF', '#7E48D7', '#FFA1D0', '#502239', '#C5AAFF'],
    [Ester.EB]: ['#843CCA', '#F0DFFF', '#C8318B', '#CEAAFF', '#392650', '#FFA3D7'],
    [Ester.EV]: ['#2467D2', '#DFEBFF', '#764BD1', '#98BFFF', '#233451', '#C8AEFF'],
    [Ester.EC]: ['#007B8C', '#D4F3F5', '#2270CA', '#72DCE8', '#183D45', '#94BDFF'],
    [Ester.EN]: ['#347F36', '#E3F2D0', '#07837B', '#B1DC88', '#2D4025', '#73DCC7'],
    [Ester.EU]: ['#B75514', '#FFE9CE', '#CF3569', '#FFB977', '#4A3020', '#FF99BE'],
    [Ester.CPA]: ['#6744C5', '#EAE2FF', '#BE347F', '#BEAEFF', '#322850', '#FFA1CF'],
    [Ester.T]: ['#C24624', '#FFE1D4', '#AE6A09', '#FFA78C', '#4C2C25', '#EBC275'],
    [Ester.TC]: ['#07846C', '#D3F4E8', '#2A6CCB', '#74E0BB', '#173F34', '#98BDFF'],
    [Ester.TE]: ['#3353C3', '#E2E8FF', '#008288', '#A8B9FF', '#293352', '#70D9DE'],
    [Ester.TU]: ['#697D15', '#EDF3D2', '#B96019', '#CDD984', '#38401F', '#F5B87B'],
};

const ESTRADIOL_ESTERS: ReadonlySet<Ester> = new Set([
    Ester.E2, Ester.EB, Ester.EV, Ester.EC, Ester.EN, Ester.EU,
]);

/** Decorative medicine tile for a labelled choice row. */
export function MedicineIcon({ ester }: { ester: Ester }) {
    const [ink, fill, accent, darkInk, darkFill, darkAccent] = MEDICINE_PALETTES[ester];
    const style = {
        '--medicine-ink-light': ink,
        '--medicine-fill-light': fill,
        '--medicine-accent-light': accent,
        '--medicine-ink-dark': darkInk,
        '--medicine-fill-dark': darkFill,
        '--medicine-accent-dark': darkAccent,
    } as CSSProperties;
    const isEstradiol = ESTRADIOL_ESTERS.has(ester);

    return (
        <span className={`medicine-choice-icon${isEstradiol ? ' medicine-choice-icon-estradiol' : ''}`}
            data-ester={ester} style={style} aria-hidden="true">
            {isEstradiol ? <EstradiolIcon size={28} /> : <Molecule size={23} />}
        </span>
    );
}
