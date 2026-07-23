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
  },
  variants: {
    variant: {
      solid: {
        bg: 'teal.400',
        color: 'gray.900',
        _hover: { bg: 'teal.500' },
      },
      outline: {
        borderColor: 'gray.600',
        color: 'fg',
      },
    },
  },
});

const inputRecipe = defineRecipe({
  base: {
    borderRadius: 10,
  },
  variants: {
    variant: {
      outline: {
        borderColor: 'gray.600',
      },
    },
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
  },
});

const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      DEFAULT: {
        value: { _light: '{colors.white}', _dark: '{colors.gray.900}' },
      },
      surface: {
        DEFAULT: { value: '{colors.gray.800}' },
        hover: { value: '{colors.gray.700}' },
      },
    },
    border: {
      DEFAULT: {
        value: { _light: '{colors.gray.200}', _dark: '#1a2120' },
      },
      strong: { value: '{colors.gray.500}' },
    },
    fg: {
      muted: {
        value: { _light: '{colors.gray.600}', _dark: '#8b908e' },
      },
    },
  },
});

export const customTheme = createSystem(defaultConfig, {
  theme: {
    tokens,
    semanticTokens,
    recipes: {
      button: buttonRecipe,
      input: inputRecipe,
    },
  },
});

export default customTheme;
