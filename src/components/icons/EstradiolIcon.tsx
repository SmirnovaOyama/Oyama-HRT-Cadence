import estradiolImage from '../../assets/estradiol.png';

/** Owner-provided artwork shared by estradiol and its esters. */
export function EstradiolIcon({ size = 24, className }: { size?: number; className?: string }) {
    return <img src={estradiolImage} alt="" aria-hidden="true" width={size} height={size}
        className={className} draggable={false} />;
}
