import React, { useState } from 'react';
import { BackHeader, ListGroup, ListRow } from '../components/ui';
import { GroupHeader, LIST_CHECK, YouPage } from './you/shared';
import { useTranslation } from '../contexts/LanguageContext';

interface MilkTeaEasterEggProps {
    onBack: () => void;
}

type Tag = 'recommended' | 'not_recommended' | null;

interface ParsedOption {
    raw: string;
    label: string;
    tag: Tag;
}

interface Category {
    title: string;
    options: ParsedOption[];
}

const TAG_PATTERN = /\((recommended|not recommended)\)$/;

function parseOption(raw: string): ParsedOption {
    const match = raw.match(TAG_PATTERN);
    if (!match) return { raw, label: raw, tag: null };
    return {
        raw,
        label: raw.slice(0, match.index).trim(),
        tag: match[1] === 'recommended' ? 'recommended' : 'not_recommended',
    };
}

function makeCategory(title: string, options: string[]): Category {
    return { title, options: options.map(parseOption) };
}

const CATEGORIES: Category[] = [
    makeCategory('Sweetener', ['Rock sugar', 'Zero-calorie sweetener', 'Low-GI L-arabinose']),
    makeCategory('Temperature', ['Iced (recommended)', 'Hot', 'Warm']),
    makeCategory('Matcha mochi', ['Regular', 'Extra mochi', 'Less mochi', 'No mochi']),
    makeCategory('Ice', ['Regular', 'Less ice', 'No ice (not recommended)']),
    makeCategory('Sweetness', ['Less sweet (recommended)', 'Lightly sweet', 'Very lightly sweet', 'No added sugar (not recommended)']),
    makeCategory('Matcha', ['Regular matcha', 'Extra matcha']),
    makeCategory('Jelly', ['Regular matcha jelly', 'Extra matcha jelly', 'No matcha jelly']),
    makeCategory('Topping', ['Regular dusting', 'Full matcha dusting', 'No dusting']),
    makeCategory('Cream topping', ['On the drink', 'Packed separately']),
    makeCategory('Straw', ['Biodegradable straw', 'No straw']),
];

function defaultIndex(cat: Category): number {
    const i = cat.options.findIndex(o => o.tag === 'recommended');
    return i >= 0 ? i : 0;
}

const MilkTeaEasterEgg: React.FC<MilkTeaEasterEggProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<number[]>(() => CATEGORIES.map(defaultIndex));

    const choose = (catIdx: number, optIdx: number) => {
        setSelected(prev => prev.map((v, i) => (i === catIdx ? optIdx : v)));
    };

    const tagLine = (tag: Tag) => {
        if (tag === 'recommended') {
            return <span className="font-semibold text-[var(--c-accent)]">{t('milktea.recommended')}</span>;
        }
        if (tag === 'not_recommended') {
            return <span className="font-semibold text-[var(--c-attention)]">{t('milktea.not_recommended')}</span>;
        }
        return undefined;
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('milktea.title')} />

            <div className="mt-2 flex flex-col gap-6">
                {CATEGORIES.map((cat, catIdx) => (
                    <ListGroup key={cat.title} header={cat.title} selection="single" checkIcon={LIST_CHECK}>
                        {cat.options.map((opt, optIdx) => (
                            <ListRow
                                key={opt.raw}
                                title={opt.label}
                                sub={tagLine(opt.tag)}
                                selected={selected[catIdx] === optIdx}
                                onClick={() => choose(catIdx, optIdx)}
                            />
                        ))}
                    </ListGroup>
                ))}

                <section aria-labelledby="milktea-receipt">
                    <GroupHeader id="milktea-receipt">{t('milktea.receipt_title')}</GroupHeader>
                    <div className="rounded-2xl bg-[var(--c-plate)] p-4 font-mono text-sm leading-relaxed">
                        <p className="m-0 text-[var(--c-ink)]">{t('milktea.title')}</p>
                        {CATEGORIES.map((cat, catIdx) => (
                            <p key={cat.title} className="m-0 text-[var(--c-muted)]">
                                {cat.title}: {cat.options[selected[catIdx]].label}
                            </p>
                        ))}
                    </div>
                </section>

                <p className="m-0 px-4 text-sm text-[var(--c-muted)]">{t('milktea.footer')}</p>
            </div>
        </YouPage>
    );
};

export default MilkTeaEasterEgg;
