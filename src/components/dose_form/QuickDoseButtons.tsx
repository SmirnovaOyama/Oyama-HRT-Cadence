import { Route, Ester } from '../../../logic';

/** A saved amount for one route and medicine. The Log a dose sheet lists
 *  every quick dose as a row of its "What" list, and adds new ones from its
 *  "Save for next time" group (see DoseForm). */
export interface QuickDose {
    id: string;
    route: Route;
    ester: Ester;
    value: number;
    createdAt: number;
}
