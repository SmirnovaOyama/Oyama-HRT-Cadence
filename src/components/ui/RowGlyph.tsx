import type { IconComponent } from '../icons';

export type RowGlyphTone = 'muted' | 'accent' | 'attention' | 'danger';

/** The leading mark of a content row (a dose, a result, a supply, an "Add"
 *  row): one 20px outline glyph in a 24px column, no tile and no fill. Colour
 *  only says something the words already say (an accent "Add", an attention
 *  "Reorder"); medicines are named in the title, never colour-coded here.
 *  Settings-style rows take no leading glyph at all (format_rules.md 5). */
export function RowGlyph({ icon: Icon, tone = 'muted' }: { icon: IconComponent; tone?: RowGlyphTone }) {
    return (
        <span className="row-glyph" data-tone={tone} aria-hidden="true">
            <Icon size={20} />
        </span>
    );
}
