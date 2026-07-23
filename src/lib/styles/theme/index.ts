import {
  createSystem,
  defaultConfig,
  defineRecipe,
  defineSemanticTokens,
  defineTokens,
} from '@chakra-ui/react';

const buttonRecipe = defineRecipe({
  base: {
    borderRadius: 24,
    transitionDuration: 'fast',
    transitionProperty: 'background, color, box-shadow, transform',
    transitionTimingFunction: 'ease-out',
    _active: { transform: 'scale(0.97)' },
  },
  variants: {
    variant: {
      solid: {
        bg: 'gold.400',
        color: 'gray.900',
        _hover: { bg: 'gold.300' },
      },
      outline: {
        borderColor: 'gray.500',
        color: 'fg',
        _hover: { borderColor: 'gold.400', color: 'gold.300' },
      },
    },
  },
});

const inputRecipe = defineRecipe({
  base: {
    borderRadius: 10,
    transitionDuration: 'fast',
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: 'ease-out',
  },
  variants: {
    variant: {
      outline: {
        borderColor: 'gray.500',
        focusRingColor: 'gold.400',
      },
    },
  },
});

const textareaRecipe = defineRecipe({
  base: {
    borderRadius: 10,
    transitionDuration: 'fast',
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: 'ease-out',
  },
  variants: {
    variant: {
      outline: {
        borderColor: 'gray.500',
        focusRingColor: 'gold.400',
      },
    },
  },
});

const headingRecipe = defineRecipe({
  base: {
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
});

const tokens = defineTokens({
  fonts: {
    heading: { value: 'var(--font-body)' },
    body: { value: 'var(--font-body)' },
  },
  colors: {
    gray: {
      50: { value: '#e8e9e9' },
      100: { value: '#d1d2d2' },
      200: { value: '#a3a5a5' },
      300: { value: '#747978' },
      400: { value: '#464c4b' },
      500: { value: '#181f1e' },
      600: { value: '#131918' },
      700: { value: '#0e1312' },
      800: { value: '#0a0c0c' },
      900: { value: '#050606' },
    },
    // Spotlight gold — the brand accent. Named after amber/marquee-light
    // tones rather than reused from a generic palette so it stays
    // visually distinct from the semantic red/green/orange status colors.
    gold: {
      50: { value: '#fffbeb' },
      100: { value: '#fef3c7' },
      200: { value: '#fde68a' },
      300: { value: '#fcd34d' },
      400: { value: '#fbbf24' },
      500: { value: '#f59e0b' },
      600: { value: '#d97706' },
      700: { value: '#b45309' },
      800: { value: '#92400e' },
      900: { value: '#78350f' },
    },
  },
});

// TvSync is a dark-only, cinematic experience (no light-mode toggle is
// exposed), so these tokens resolve to a single value rather than
// branching on color mode.
const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      DEFAULT: { value: '{colors.gray.900}' },
      surface: {
        DEFAULT: { value: '{colors.gray.800}' },
        hover: { value: '{colors.gray.700}' },
      },
    },
    border: {
      DEFAULT: { value: '#1a2120' },
      strong: { value: '{colors.gray.500}' },
    },
    fg: {
      muted: { value: '#8b908e' },
    },
    accent: {
      DEFAULT: { value: '{colors.gold.400}' },
      emphasized: { value: '{colors.gold.300}' },
    },
  },
});

export const customTheme = createSystem(defaultConfig, {
  theme: {
    tokens,
    semanticTokens,
    recipes: {
      button: buttonRecipe,
      heading: headingRecipe,
      input: inputRecipe,
      textarea: textareaRecipe,
    },
  },
});

export default customTheme;
