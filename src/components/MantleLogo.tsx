import Image from "next/image";

const LOGOS = {
  full: {
    src: "/mantle-logo-main.png",
    width: 1264,
    height: 847,
    defaultClass: "h-auto w-full max-w-[300px] object-contain",
    displayWidth: 300,
  },
  mark: {
    src: "/mantle-logo-main.png", // TODO: Change to main logo
    width: 1264,
    height: 841,
    defaultClass: "h-9 w-auto object-contain",
    displayWidth: 72,
  },
} as const;

type MantleLogoVariant = keyof typeof LOGOS;

type MantleLogoProps = {
  className?: string;
  priority?: boolean;
  /** Full wordmark for login/home; church mark for nav and favicon */
  variant?: MantleLogoVariant;
};

export function MantleLogo({ className, priority, variant = "full" }: MantleLogoProps) {
  const logo = LOGOS[variant];
  const height = Math.round((logo.displayWidth * logo.height) / logo.width);

  return (
    <Image
      src={logo.src}
      alt="Mantle"
      width={logo.displayWidth}
      height={height}
      className={className ?? logo.defaultClass}
      priority={priority}
    />
  );
}
