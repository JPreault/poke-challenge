export const RANKED_MODES = [
  "IMAGE_TO_NAME",
  "NAME_TO_IMAGE",
  "LETTER_INPUT",
  "CRY_GUESS",
  "POKEDLE",
  "DESCRIPTION_GUESS",
  "BLUR_GUESS",
  "ZOOM_GUESS",
] as const;

export type RankedModeValue = (typeof RANKED_MODES)[number];
