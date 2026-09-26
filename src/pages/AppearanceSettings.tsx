import React, { useId } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { usePixelCats, CatStyle } from '../contexts/PixelCatContext';
import { AppTheme } from '../constants';
import { BackHeader, ListGroup, ListRow, Switch } from '../components/ui';
import { Appearance, Desktop, Moon } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import PixelCat from '../components/PixelCat';
import { LIST_CHECK, YouPage } from './you/shared';

interface AppearanceSettingsProps {
    theme: AppTheme;
    setTheme: (theme: AppTheme) => void;
    onBack: () => void;
}

const OPTIONS: { value: AppTheme; labelKey: string }[] = [
    { value: 'light', labelKey: 'theme.light' },
    { value: 'dark', labelKey: 'theme.dark' },
    { value: 'system', labelKey: 'theme.system' },
    { value: 'mono', labelKey: 'you.theme_mono' },
];

// Each swatch is a stack of flat, equal bands (no gradients anywhere). The flag
// is its five even stripes; the plain styles are a single band.
const CAT_STYLE_SWATCHES: { id: CatStyle; bands: string[] }[] = [
    {
        id: 'flag',
        bands: ['var(--pixel-blue)', 'var(--pixel-pink)', 'var(--pixel-white)', 'var(--pixel-pink)', 'var(--pixel-blue)'],
    },
    { id: 'blue', bands: ['var(--pixel-blue)'] },
    { id: 'pink', bands: ['var(--pixel-pink)'] },
];

/** Appearance: the colour theme, then the pixel cats and their colours. */
const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ theme, setTheme, onBack }) => {
    const { t } = useTranslation();
    const { showCats, setShowCats, catStyle, setCatStyle } = usePixelCats();
    const catsId = useId();

    return (
        <YouPage className="[&_.list-row-tall]:min-h-[52px]">
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('settings.theme')} />

            <div className="mt-2 flex flex-col gap-6">
                <ListGroup className="[&_.list-sep-icon]:ms-[48px]" selection="single" checkIcon={LIST_CHECK} aria-label={t('settings.theme')}>
                    {OPTIONS.map(({ value, labelKey }) => (
                        <ListRow
                            key={value}
                            leading={<LabelIcon icon={value === 'dark' ? Moon : value === 'system' ? Desktop : Appearance}
                                tone={value === 'light' ? 'orange' : value === 'dark' ? 'purple' : value === 'system' ? 'blue' : 'muted'} />}
                            title={t(labelKey)} selected={theme === value} onClick={() => setTheme(value)}
                        />
                    ))}
                </ListGroup>

                <ListGroup footer={t('you.pixel_cats_sub')}>
                    <ListRow
                        leading={<PixelCat size={24} force />}
                        title={<span id={catsId}>{t('settings.pixel_cats')}</span>}
                        trailing={<Switch checked={showCats} onChange={setShowCats} aria-labelledby={catsId} />}
                    />
                </ListGroup>

                {/* Only worth showing once the cats themselves are on. The swatch is
                    the content of each choice, so every row in this group has one. */}
                {showCats && (
                    <ListGroup header={t('settings.cat_style')} selection="single" checkIcon={LIST_CHECK}>
                        {CAT_STYLE_SWATCHES.map(({ id, bands }) => (
                            <ListRow
                                key={id}
                                leading={
                                    <span className="grid h-10 w-10 place-items-center" aria-hidden="true">
                                        <span className="flex h-8 w-8 flex-col overflow-hidden rounded-[8px] border border-[var(--c-hairline)]">
                                            {bands.map((color, i) => (
                                                <span key={i} className="block w-full flex-1" style={{ background: color }} />
                                            ))}
                                        </span>
                                    </span>
                                }
                                title={t(`settings.cat_style.${id}`)}
                                selected={catStyle === id}
                                onClick={() => setCatStyle(id)}
                            />
                        ))}
                    </ListGroup>
                )}
            </div>
        </YouPage>
    );
};

export default AppearanceSettings;
