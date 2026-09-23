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

const TAG_PATTERN = /[（(](推荐|不推荐)[）)]$/;

function parseOption(raw: string): ParsedOption {
    const match = raw.match(TAG_PATTERN);
    if (!match) return { raw, label: raw, tag: null };
    return {
        raw,
        label: raw.slice(0, match.index).trim(),
        tag: match[1] === '推荐' ? 'recommended' : 'not_recommended',
    };
}

function makeCategory(title: string, options: string[]): Category {
    return { title, options: options.map(parseOption) };
}

const CATEGORIES: Category[] = [
    makeCategory('糖类型（原创）', ['纯粹真冰糖', '真0卡糖', '低GI「L-阿拉伯糖」']),
    makeCategory('状态', ['冰（推荐）', '热', '温']),
    makeCategory('浓抹糯糯', ['标准（含浓抹糯糯）', '加量浓抹糯糯', '少浓抹糯糯', '去浓抹糯糯']),
    makeCategory('冰量', ['推荐', '少冰', '去冰（不推荐）']),
    makeCategory('甜度', ['少甜（推荐）', '少少甜', '少少少甜', '不另外加糖（不推荐）']),
    makeCategory('抹茶', ['标准抹茶', '加浓抹茶']),
    makeCategory('小料', ['标准（含抹茶冻）', '加量抹茶冻', '去抹茶冻']),
    makeCategory('顶料', ['默认方式', '抹茶粉撒满', '不撒粉']),
    makeCategory('云顶分装', ['不分装', '免费分装']),
    makeCategory('绿色喜茶（吸管）', ['可降解吸管', '不使用吸管']),
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
                                {cat.title}：{cat.options[selected[catIdx]].label}
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
