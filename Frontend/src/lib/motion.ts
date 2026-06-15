import { type Transition, type Variants } from "framer-motion";

export const transitions = {
  fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } as Transition,
  normal: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } as Transition,
  slow: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } as Transition,
  spring: { type: "spring", stiffness: 400, damping: 30 } as Transition,
  springGentle: { type: "spring", stiffness: 200, damping: 25 } as Transition,
  bounce: { type: "spring", stiffness: 600, damping: 15 } as Transition,
};

export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } as Variants,

  slideUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  } as Variants,

  slideDown: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  } as Variants,

  slideLeft: {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 },
  } as Variants,

  slideRight: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
  } as Variants,

  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  } as Variants,

  scaleInBounce: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: transitions.bounce },
    exit: { opacity: 0, scale: 0.9 },
  } as Variants,

  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  } as Variants,

  staggerItem: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  } as Variants,
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export const hoverLift = {
  whileHover: { y: -2, transition: transitions.fast },
  whileTap: { y: 0, transition: transitions.fast },
};

export const pressScale = {
  whileTap: { scale: 0.95, transition: transitions.fast },
};

export const dialogVariants = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } as Variants,
  content: {
    initial: { opacity: 0, scale: 0.95, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0, transition: transitions.spring },
    exit: { opacity: 0, scale: 0.95, y: 8, transition: transitions.fast },
  } as Variants,
};

export const drawerVariants = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0, transition: transitions.springGentle },
    exit: { x: "-100%", transition: transitions.normal },
  } as Variants,
  right: {
    initial: { x: "100%" },
    animate: { x: 0, transition: transitions.springGentle },
    exit: { x: "100%", transition: transitions.normal },
  } as Variants,
};

export const listVariants = {
  container: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.03,
      },
    },
  } as Variants,
  item: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0, transition: transitions.normal },
    exit: { opacity: 0, x: -8, transition: transitions.fast },
  } as Variants,
};

export const toastVariants = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: transitions.spring },
  exit: { opacity: 0, y: 16, scale: 0.95, transition: transitions.fast },
} as Variants;

export const tooltipVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: transitions.fast },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
} as Variants;

export const dropdownVariants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: transitions.fast },
  exit: { opacity: 0, scale: 0.95, y: -4, transition: transitions.fast },
} as Variants;
