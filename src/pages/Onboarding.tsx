import React, { useEffect, useRef, useState } from 'react';
import PixelCat from '../components/PixelCat';
import PixelMark, { MarkName, MarkState } from '../components/PixelMark';
import OnboardingCurve, { useOnboardingCurve, BEATS, type Beat, type CurveData } from '../components/OnboardingCurve';
import { useTranslation } from '../contexts/LanguageContext';
import { useHRTMode } from '../contexts/HRTModeContext';
import { Lang, TRANSLATIONS } from '../i18n/translations';
import { Button, ListGroup, ListRow } from '../components/ui';
import { LIST_CHECK } from './you/shared';

const ONBOARDING_KEY = 'app-onboarded';

/**
 * Anyone with records on this device has been using the app since before there
 * was an intro, and greeting them as a stranger — worse, offering to set the
 * language and HRT mode they already chose — is the one way this screen can do
 * harm. So an existing dose log counts as having been onboarded.
 *
 * The keys are the ones useAppData writes: `hrt-events` while signed out,
 * `hrt-masc-events` for transmasc, and `hrt-u<id>-` prefixed variants per
 * account. Matched by shape rather than listed, since the accounts on a device
 * aren't known here.
 */
const EVENTS_KEY = /^hrt-(u[^-]+-)?(masc-)?events$/;

export const shouldShowOnboarding = (): boolean => {
    if (localStorage.getItem(ONBOARDING_KEY) === 'true') return false;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !EVENTS_KEY.test(key)) continue;
        const value = localStorage.getItem(key);
        if (value && value !== '[]') return false;
    }
    return true;
};

export const markOnboardingSeen = (): void => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
};

/**
 * A hairline under the language list while any rows are still below the fold.
 * The list's scrollbar is hidden like every other scroller in the app, so
 * without a cue a row can end flush against the footer and read as the end of
 * the languages — on a short screen that quietly hides two of them. A flat
 * edge line, like an iOS scroll edge, rather than a fade: no gradients.
 */
const scrollEdge = 'border-b border-[var(--c-rule)]';

/**
 * The three slots of the "how it works" step, and the only step that splits in
 * two on a wide window — because the chart is the only thing in the intro that
 * gains anything from a column of its own. Drawn at the width of a phone it was
 * a thumbnail beside 500px of empty ground; given half a wide window it draws
 * at roughly the size the Overview will draw it.
 *
 * On a phone the three stack in the order they have always read in: heading,
 * chart, rows. On a wide window the chart takes the left column and spans both
 * rows, with the words beside it.
 */
const Head: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-w-0 lg:col-start-2 lg:row-start-1">{children}</div>
);

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 flex items-center justify-center lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:mt-0">
        {children}
    </div>
);

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="mt-4 min-w-0 lg:col-start-2 lg:row-start-2 lg:mt-0">{children}</div>
);

/**
 * Progress, in the chart's own vocabulary: dose rings sitting on the zero rule,
 * the same hollow circle and the same hairline OnboardingCurve draws. Filled
 * behind you, hollow ahead — so the mark has already been read once by the time
 * the chart uses it for real.
 */
const DoseRings: React.FC<{ count: number; at: number }> = ({ count, at }) => {
    const GAP = 15, PAD = 7, MID = 9;
    const width = PAD * 2 + GAP * (count - 1);
    return (
        <svg
            viewBox={`0 0 ${width} 18`}
            width={width}
            height={18}
            aria-hidden="true"
            focusable="false"
            className="text-[var(--c-accent)]"
        >
            <line
                x1={PAD} y1={MID} x2={width - PAD} y2={MID}
                strokeWidth={1}
                className="stroke-[var(--c-rule)]"
            />
            {Array.from({ length: count }, (_, i) => (
                <circle
                    key={i}
                    className={`onb-ring ${i <= at
                        ? 'fill-current stroke-current'
                        : 'fill-[var(--c-paper)] stroke-[var(--c-rule)]'}`}
                    cx={PAD + i * GAP}
                    cy={MID}
                    r={i === at ? 4.2 : 3}
                    strokeWidth={1.5}
                />
            ))}
        </svg>
    );
};

/** A step's large title and the sentence under it. */
const StepTitle: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <>
        <h1 className="m-0 text-3xl font-bold text-[var(--c-ink)]">{title}</h1>
        <p className="m-0 mt-3 text-base text-[var(--c-muted)]">{subtitle}</p>
    </>
);

/** Read straight out of the packs to size the greeting — see the welcome step. */
const SUBTITLE_KEY = 'onboarding.welcome_subtitle';

interface PointProps {
    /** One of the pixel sprites in PixelMark. */
    mark: MarkName;
    title: string;
    desc: string;
    /**
     * Where the chart above is relative to this row's beat — see HowStep. The
     * mark acts the beat out and the title dims while it is still to come,
     * which is what stops the chart reading as decoration floating over an
     * unrelated list. Omitted on the rows of steps that have no chart.
     */
    state?: MarkState;
    /** The beat's length in ms, for the mark to play across. */
    duration?: number;
    /** Restarts the mark's beat when it changes. */
    playKey?: number;
    /** Makes the row a button: the beat it names replays from the top. */
    onClick?: () => void;
}

// A function rather than a component: ListGroup reads each row's `leading`
// prop to inset the separator under it, so the rows have to be ListRows.
const pointRow = ({ mark, title, desc, state = 'done', duration, playKey, onClick }: PointProps) => (
    <ListRow
        key={mark}
        /* A fixed box, not a tile: the sprites are different heights and have
           to sit on one column, but they are drawings, and a drawing in a
           tinted square is an icon again. */
        leading={
            <span className="flex h-10 w-10 items-center justify-center">
                <PixelMark key={playKey} name={mark} size={28} state={state} duration={duration} />
            </span>
        }
        title={<span className={state === 'asleep' ? 'text-[var(--c-muted)]' : undefined}>{title}</span>}
        sub={desc}
        /* A row that replays its beat reports whether that beat is playing.
           No check is drawn: the group has no check icon. */
        selected={onClick ? state === 'playing' : undefined}
        onClick={onClick}
    />
);

/** Index of the chart step, the only one that takes two columns when there's room. */
const CHART_STEP = 2;

/** Rows of the "how it works" step, in beat order — see BEATS. */
const HOW_ROWS: { mark: MarkName; title: string; desc: string }[] = [
    { mark: 'syringe', title: 'onboarding.how_log', desc: 'account.onboarding.log_desc' },
    { mark: 'chart', title: 'onboarding.how_chart', desc: 'account.onboarding.chart_desc' },
    { mark: 'vial', title: 'onboarding.how_calibrate', desc: 'account.onboarding.calibrate_desc' },
];

/**
 * The "how it works" step: the chart is the argument and the three rows are
 * its captions, one per beat. The sequence plays itself once on arrival, since
 * most people will just watch — but a film that runs while the title is still
 * being read is a film half missed, so every row is also a button that replays
 * the chart from that beat, and a Replay appears once the whole thing has run.
 *
 * Owns its clock, and is mounted only while the step is showing, so leaving
 * and coming back starts the story from the top.
 */
const HowStep: React.FC<{ curve: CurveData | null }> = ({ curve }) => {
    const { t } = useTranslation();
    const [beat, setBeat] = useState<Beat>(0);
    // Bumped on every replay: a beat restarted from its own start is the same
    // state twice, and the chart and marks need something to remount on.
    const [playKey, setPlayKey] = useState(0);
    const [finished, setFinished] = useState(false);
    // Nothing plays until the engine has answered; the marks wait grey rather
    // than acting out a chart that isn't there yet.
    const live = !!curve;

    useEffect(() => {
        if (!live || finished) return;
        const handle = window.setTimeout(() => {
            if (beat < 2) setBeat((beat + 1) as Beat);
            else setFinished(true);
        }, BEATS[beat]);
        return () => window.clearTimeout(handle);
    }, [live, beat, playKey, finished]);

    const play = (from: Beat) => {
        setBeat(from);
        setFinished(false);
        setPlayKey(k => k + 1);
    };

    const stateOf = (i: number): MarkState => {
        if (!live) return 'asleep';
        if (finished || i < beat) return 'done';
        return i === beat ? 'playing' : 'asleep';
    };

    return (
        <>
            <Head>
                <StepTitle title={t('onboarding.how_title')} subtitle={t('onboarding.how_subtitle')} />
            </Head>
            {/* The three rows below say what the app does; this says it. The
                curve, the doses and the fit are the engine's own output, so
                what is promised here is what the Overview will draw. Given a
                column to itself it draws at something like the size it will be
                on the Overview, instead of at thumbnail size beside 500px of
                empty page. */}
            <Stage>
                <div className="w-full">
                    <OnboardingCurve
                        data={curve}
                        beat={beat}
                        playKey={playKey}
                        caption={t('onboarding.how_chart_caption')}
                        legend={{ model: t('onboarding.how_chart_legend_model'), labs: t('onboarding.how_chart_legend_labs') }}
                        action={finished && (
                            <Button variant="plain" className="ms-auto" onClick={() => play(0)}>
                                {t('onboarding.how_replay')}
                            </Button>
                        )}
                    />
                </div>
            </Stage>
            <Body>
                <ListGroup footer={t('account.onboarding.how_note')}>
                    {HOW_ROWS.map(({ mark, title, desc }, i) => pointRow({
                        mark,
                        title: t(title),
                        desc: t(desc),
                        state: stateOf(i),
                        duration: BEATS[i],
                        playKey,
                        onClick: () => play(i as Beat),
                    }))}
                </ListGroup>
            </Body>
        </>
    );
};

interface OnboardingProps {
    /** Same list Settings uses, rather than a second copy that can drift. */
    languageOptions: { value: string; label: string }[];
    onDone: () => void;
}

/**
 * First run. Four screens, in the order a new user needs them: language before
 * anything else (the app defaults to Chinese, so every other word is unreadable
 * until it's set), then HRT mode, then what the app actually does, then what it
 * does with your data and what it can't do for you.
 *
 * Rendered instead of the app shell, not as a tab inside it — the nav would
 * invite tabbing away halfway through, leaving language and mode on defaults
 * that the flow exists to ask about.
 */
const Onboarding: React.FC<OnboardingProps> = ({ languageOptions, onDone }) => {
    const { t, lang, setLang } = useTranslation();
    const { mode, setMode, isTransmasc } = useHRTMode();
    const curve = useOnboardingCurve(isTransmasc);

    const [step, setStep] = useState(0);
    // Only so the step change slides the way the app's view changes do.
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

    const langListRef = useRef<HTMLDivElement>(null);
    const [langsBelow, setLangsBelow] = useState(false);
    const syncLangsBelow = () => {
        const el = langListRef.current;
        setLangsBelow(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    };
    // Re-measured on step change, since the list only exists on step 0. The two
    // watchers cover different things and neither subsumes the other: `resize`
    // catches the rotation, while the observer catches the list's box moving
    // without the window doing anything — the address bar sliding away, or a
    // font landing late and retyping the rows.
    useEffect(() => {
        syncLangsBelow();
        window.addEventListener('resize', syncLangsBelow);
        const el = langListRef.current;
        const observer = new ResizeObserver(syncLangsBelow);
        if (el) {
            observer.observe(el);
            for (const row of Array.from(el.children)) observer.observe(row);
        }
        return () => {
            window.removeEventListener('resize', syncLangsBelow);
            observer.disconnect();
        };
    }, [step]);

    const modeOptions = [
        { value: 'transfem', labelKey: 'mode.transfem', descKey: 'onboarding.mode_transfem_desc' },
        { value: 'transmasc', labelKey: 'mode.transmasc', descKey: 'onboarding.mode_transmasc_desc' },
    ] as const;

    const steps = [
        // The cat is the welcome, so it gets the room. Whatever it happens to be
        // doing at this hour is the greeting — the schedule is the point, and a
        // pose reserved for first-timers would be the one cat in the app that
        // isn't living out its day. It obeys the "show pixel cats" preference
        // like every other cat: someone replaying the intro with them switched
        // off asked not to see one.
        // `h-full` only where it earns its keep. On a phone it is what lets the
        // greeting stay put while the languages scroll under it. On a wide
        // window there is room for all seven, and filling the height there
        // pinned this step to the top with a slab of empty page under the last
        // language — while every other step sat centred, so stepping between
        // them jumped the page. Sized to its content it centres like the rest.
        <div key="welcome" className="flex h-full flex-col pt-6 text-center lg:h-auto">
            {/* The greeting holds its place; only the list below it travels.
                Seven languages don't fit under the cat on a short screen, and
                scrolling the whole step would carry away the one sentence
                explaining what is being chosen. */}
            <div className="shrink-0">
                <div className="flex justify-center">
                    <PixelCat pose="donut" size={182} />
                </div>
                <h1 className="m-0 mt-6 text-3xl font-bold text-[var(--c-ink)]">{t('onboarding.welcome_title')}</h1>
                {/* Every translation of the sentence stacked into one grid cell,
                    the inactive ones hidden but still taking up their space, so
                    the box is as tall as the longest one at whatever width this
                    is. The list below therefore starts at the same y in every
                    language — otherwise picking Türkçe after 简体中文 grows the
                    sentence by a line and slides the list down under the finger
                    that just tapped it. A fixed height can't stand in for this:
                    the longest runs to four lines at 320px and three at 375px. */}
                <div className="mx-auto mt-3 grid max-w-sm">
                    {languageOptions.map(({ value }) => {
                        const current = value === lang;
                        const text = current
                            ? t(SUBTITLE_KEY)
                            : (TRANSLATIONS as Record<string, Record<string, string>>)[value]?.[SUBTITLE_KEY];
                        if (!text) return null;
                        return (
                            <p
                                key={value}
                                className={`col-start-1 row-start-1 m-0 text-base text-[var(--c-muted)] ${current ? '' : 'invisible'}`}
                            >
                                {text}
                            </p>
                        );
                    })}
                </div>
            </div>
            {/* Narrower than the step's max-w-md: the labels are one or two
                words, and across the full column the check would drift far
                enough from its language to stop reading as one row.

                min-h keeps the list usable rather than letting flex-1 squeeze
                it to nothing on a very short viewport — past that point the
                step outgrows its box and the outer scroller takes over, which
                is the graceful way to lose the pinned greeting. */}
            <div
                ref={langListRef}
                onScroll={syncLangsBelow}
                className={`mx-auto mt-7 min-h-[7.5rem] w-full max-w-sm flex-1 overflow-y-auto scrollbar-hide text-start lg:flex-none ${langsBelow ? scrollEdge : ''}`}
            >
                <ListGroup selection="single" checkIcon={LIST_CHECK} aria-label={t('onboarding.welcome_title')}>
                    {languageOptions.map(({ value, label }) => (
                        <ListRow
                            key={value}
                            title={label}
                            selected={lang === value}
                            onClick={() => setLang(value as Lang)}
                        />
                    ))}
                </ListGroup>
            </div>
        </div>,

        <div key="mode" className="pt-8">
            <StepTitle title={t('onboarding.mode_title')} subtitle={t('account.onboarding.mode_sub')} />
            <ListGroup
                selection="single"
                checkIcon={LIST_CHECK}
                aria-label={t('onboarding.mode_title')}
                footer={t('account.onboarding.mode_footer')}
                className="mt-6"
            >
                {modeOptions.map(({ value, labelKey, descKey }) => (
                    <ListRow
                        key={value}
                        title={t(labelKey)}
                        sub={t(descKey)}
                        selected={mode === value}
                        onClick={() => setMode(value)}
                    />
                ))}
            </ListGroup>
        </div>,

        <HowStep key="how" curve={curve} />,

        <div key="privacy" className="pt-8">
            <StepTitle title={t('onboarding.privacy_title')} subtitle={t('onboarding.privacy_subtitle')} />
            <ListGroup className="mt-6">
                {pointRow({ mark: 'lock', title: t('onboarding.privacy_local'), desc: t('account.onboarding.local_desc') })}
                {pointRow({ mark: 'cloud', title: t('onboarding.privacy_cloud'), desc: t('account.onboarding.cloud_desc') })}
                {pointRow({ mark: 'caution', title: t('onboarding.privacy_medical'), desc: t('account.onboarding.medical_desc') })}
            </ListGroup>
        </div>,
    ];

    const isLast = step === steps.length - 1;

    const go = (next: number) => {
        setDirection(next > step ? 'forward' : 'backward');
        setStep(next);
    };

    return (
        <div className="flex h-[100dvh] w-full select-none flex-col bg-[var(--c-paper)] font-sans text-[var(--c-ink)]">
            <div className="flex shrink-0 justify-end px-4 pt-[calc(0.25rem+env(safe-area-inset-top,0px))]">
                <Button
                    variant="plain"
                    onClick={onDone}
                    className={isLast ? 'invisible' : ''}
                    tabIndex={isLast ? -1 : 0}
                    aria-hidden={isLast || undefined}
                >
                    {t('onboarding.skip')}
                </Button>
            </div>

            {/* `safe center`, not `start`: on a phone the step is usually taller
                than the space for it anyway, so this was invisible there. On a
                wide, short-content window — mode, how-it-works, privacy — start
                left the card glued to the top of the flex area with a slab of
                empty page below it down to the footer. Centering fixes that
                without touching step 0, whose `h-full` already exactly fills
                the cross axis; `safe` is what keeps a step that overflows a
                short window scrolling from the top instead of clipping. */}
            <div className="onboarding-steps flex flex-1 overflow-y-auto scrollbar-hide px-4 md:px-6">
                {/* The welcome step pins its greeting and scrolls its own list,
                    so it needs the scroller's height to divide up; the rest are
                    read top to bottom and just grow.

                    Only the chart step widens on a wide window, into the two
                    columns its Head / Stage / Body slots are placed in. The
                    other three are a heading and a list of rows: given a second
                    column there is nothing to put in it, and a column of empty
                    ground beside a list is worse than a centred one. */}
                <div
                    key={step}
                    className={`mx-auto w-full max-w-md
                        ${step === CHART_STEP ? 'lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-center lg:gap-x-14 lg:gap-y-5' : ''}
                        ${step === 0 ? 'h-full pb-6 lg:h-auto' : 'pb-8'}
                        ${direction === 'backward' ? 'view-enter-backward' : 'view-enter-forward'}`}
                >
                    {steps[step]}
                </div>
            </div>

            <div className="shrink-0 border-t border-[var(--c-hairline)] bg-[var(--c-paper)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:px-6">
                <div className="mx-auto grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="justify-self-start">
                        {step > 0 && (
                            <Button variant="secondary" compact onClick={() => go(step - 1)}>
                                {t('onboarding.back')}
                            </Button>
                        )}
                    </div>

                    {/* A standalone progress mark, named for screen readers. */}
                    <span role="img" aria-label={t('account.step_of').replace('{n}', String(step + 1)).replace('{total}', String(steps.length))}>
                        <DoseRings count={steps.length} at={step} />
                    </span>

                    <div className="justify-self-end">
                        <Button variant="primary" compact onClick={() => (isLast ? onDone() : go(step + 1))}>
                            {t(isLast ? 'onboarding.start' : 'onboarding.next')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
