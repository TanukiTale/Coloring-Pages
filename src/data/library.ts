import { Difficulty, Picture, SvgRegionDefinition, SvgVariant, Theme } from '../models/domain';

const VIEW_BOX = '0 0 300 220';

type VariantMap = Record<Difficulty, SvgVariant>;

const rect = (x: number, y: number, w: number, h: number): string =>
  `M${x} ${y} H${x + w} V${y + h} H${x} Z`;

const poly = (points: Array<[number, number]>): string => {
  const [first, ...rest] = points;
  const segments = rest.map(([x, y]) => `L${x} ${y}`).join(' ');
  return `M${first[0]} ${first[1]} ${segments} Z`;
};

const circle = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

const region = (id: string, path: string): SvgRegionDefinition => ({ id, path });

const buildNatureVariants = (prefix: string, offset: number): VariantMap => {
  const easy = [
    region(`${prefix}-sky`, rect(0, 0, 300, 220)),
    region(`${prefix}-sun`, circle(54 + offset, 36, 17)),
    region(`${prefix}-mountain`, poly([[16, 158], [122 + offset, 70], [232, 158]])),
    region(
      `${prefix}-hills`,
      poly([
        [0, 172],
        [86, 124 + offset * 0.15],
        [165, 160],
        [232, 140],
        [300, 166],
        [300, 220],
        [0, 220],
      ])
    ),
    region(
      `${prefix}-river`,
      poly([
        [120, 220],
        [172, 220],
        [198, 148],
        [176, 118],
        [150, 138],
      ])
    ),
    region(`${prefix}-tree-top`, circle(236 - offset * 0.25, 124, 28)),
    region(`${prefix}-tree-trunk`, rect(228 - offset * 0.25, 142, 16, 52)),
    region(`${prefix}-meadow`, rect(0, 194, 300, 26)),
  ];

  const medium = [
    region(`${prefix}-sky-top`, rect(0, 0, 300, 60)),
    region(`${prefix}-sky-low`, rect(0, 60, 300, 160)),
    region(`${prefix}-sun-glow`, circle(54 + offset, 36, 19)),
    region(`${prefix}-sun-core`, circle(54 + offset, 36, 11)),
    region(`${prefix}-mountain-left`, poly([[16, 158], [96 + offset * 0.5, 92], [145, 158]])),
    region(`${prefix}-mountain-right`, poly([[145, 158], [122 + offset, 70], [232, 158]])),
    region(`${prefix}-hill-left`, poly([[0, 172], [80, 128 + offset * 0.15], [152, 172], [0, 172]])),
    region(`${prefix}-hill-right`, poly([[130, 170], [210, 140], [300, 170], [300, 220], [130, 220]])),
    region(`${prefix}-river-upper`, poly([[176, 118], [150, 138], [164, 178], [188, 168], [198, 148]])),
    region(`${prefix}-river-lower`, poly([[164, 178], [188, 168], [172, 220], [120, 220]])),
    region(`${prefix}-tree-crown-left`, circle(224 - offset * 0.25, 124, 18)),
    region(`${prefix}-tree-crown-right`, circle(248 - offset * 0.25, 126, 16)),
    region(`${prefix}-tree-trunk`, rect(228 - offset * 0.25, 142, 16, 52)),
    region(`${prefix}-meadow-left`, rect(0, 194, 150, 26)),
    region(`${prefix}-meadow-right`, rect(150, 194, 150, 26)),
  ];

  const challenge = [
    region(`${prefix}-sky-band-1`, rect(0, 0, 300, 36)),
    region(`${prefix}-sky-band-2`, rect(0, 36, 300, 34)),
    region(`${prefix}-sky-band-3`, rect(0, 70, 300, 150)),
    region(`${prefix}-sun-glow`, circle(54 + offset, 36, 20)),
    region(`${prefix}-sun-mid`, circle(54 + offset, 36, 14)),
    region(`${prefix}-sun-core`, circle(54 + offset, 36, 9)),
    region(`${prefix}-mountain-left`, poly([[16, 158], [82 + offset * 0.2, 112], [126, 158]])),
    region(`${prefix}-mountain-mid`, poly([[126, 158], [122 + offset, 70], [164, 158]])),
    region(`${prefix}-mountain-right`, poly([[164, 158], [198, 116], [232, 158]])),
    region(`${prefix}-hill-front-left`, poly([[0, 172], [66, 142], [120, 172], [0, 172]])),
    region(`${prefix}-hill-front-right`, poly([[106, 172], [164, 146], [230, 172], [106, 172]])),
    region(`${prefix}-hill-back`, poly([[160, 172], [220, 140], [300, 170], [300, 220], [160, 220]])),
    region(`${prefix}-river-source`, poly([[176, 118], [160, 128], [170, 148], [198, 148]])),
    region(`${prefix}-river-mid`, poly([[160, 128], [146, 146], [164, 178], [188, 168], [170, 148]])),
    region(`${prefix}-river-mouth-left`, poly([[146, 146], [130, 220], [154, 220], [164, 178]])),
    region(`${prefix}-river-mouth-right`, poly([[164, 178], [154, 220], [172, 220], [188, 168]])),
    region(`${prefix}-tree-crown-a`, circle(219 - offset * 0.25, 124, 14)),
    region(`${prefix}-tree-crown-b`, circle(236 - offset * 0.25, 116, 14)),
    region(`${prefix}-tree-crown-c`, circle(250 - offset * 0.25, 129, 13)),
    region(`${prefix}-tree-trunk`, rect(228 - offset * 0.25, 142, 16, 52)),
    region(`${prefix}-meadow-a`, rect(0, 194, 100, 26)),
    region(`${prefix}-meadow-b`, rect(100, 194, 100, 26)),
    region(`${prefix}-meadow-c`, rect(200, 194, 100, 26)),
  ];

  return {
    easy: { viewBox: VIEW_BOX, regions: easy },
    medium: { viewBox: VIEW_BOX, regions: medium },
    challenge: { viewBox: VIEW_BOX, regions: challenge },
  };
};

const buildSpaceVariants = (prefix: string, offset: number): VariantMap => {
  const easy = [
    region(`${prefix}-space`, rect(0, 0, 300, 220)),
    region(`${prefix}-planet-main`, circle(78 + offset, 72, 34)),
    region(`${prefix}-planet-ring`, poly([[26 + offset, 80], [130 + offset, 63], [136 + offset, 70], [32 + offset, 87]])),
    region(`${prefix}-moon`, circle(232 - offset * 0.4, 48, 18)),
    region(`${prefix}-rocket-body`, poly([[150, 66], [180, 146], [120, 146]])),
    region(`${prefix}-rocket-window`, circle(150, 98, 8)),
    region(`${prefix}-rocket-fin-left`, poly([[120, 146], [96, 164], [122, 160]])),
    region(`${prefix}-rocket-fin-right`, poly([[180, 146], [204, 164], [178, 160]])),
    region(`${prefix}-flame`, poly([[132, 146], [168, 146], [150, 196]])),
    region(`${prefix}-horizon`, poly([[0, 178], [100, 150], [240, 182], [300, 164], [300, 220], [0, 220]])),
  ];

  const medium = [
    region(`${prefix}-space-top`, rect(0, 0, 300, 110)),
    region(`${prefix}-space-bottom`, rect(0, 110, 300, 110)),
    region(`${prefix}-planet-shell`, circle(78 + offset, 72, 34)),
    region(`${prefix}-planet-core`, circle(78 + offset, 72, 24)),
    region(`${prefix}-planet-ring-top`, poly([[28 + offset, 78], [130 + offset, 62], [134 + offset, 66], [32 + offset, 82]])),
    region(`${prefix}-planet-ring-bottom`, poly([[32 + offset, 82], [134 + offset, 66], [138 + offset, 72], [36 + offset, 88]])),
    region(`${prefix}-moon-shell`, circle(232 - offset * 0.4, 48, 18)),
    region(`${prefix}-moon-core`, circle(232 - offset * 0.4, 48, 11)),
    region(`${prefix}-rocket-tip`, poly([[150, 66], [166, 102], [134, 102]])),
    region(`${prefix}-rocket-body-l`, poly([[134, 102], [150, 146], [120, 146]])),
    region(`${prefix}-rocket-body-r`, poly([[166, 102], [180, 146], [150, 146]])),
    region(`${prefix}-rocket-window`, circle(150, 98, 8)),
    region(`${prefix}-rocket-fin-left`, poly([[120, 146], [96, 164], [122, 160]])),
    region(`${prefix}-rocket-fin-right`, poly([[180, 146], [204, 164], [178, 160]])),
    region(`${prefix}-flame-outer`, poly([[132, 146], [168, 146], [150, 196]])),
    region(`${prefix}-flame-inner`, poly([[140, 146], [160, 146], [150, 178]])),
    region(`${prefix}-horizon-a`, poly([[0, 178], [92, 154], [160, 176], [0, 220]])),
    region(`${prefix}-horizon-b`, poly([[92, 154], [240, 182], [300, 164], [300, 220], [160, 220]])),
  ];

  const challenge = [
    region(`${prefix}-space-band-1`, rect(0, 0, 300, 60)),
    region(`${prefix}-space-band-2`, rect(0, 60, 300, 50)),
    region(`${prefix}-space-band-3`, rect(0, 110, 300, 110)),
    region(`${prefix}-planet-shell`, circle(78 + offset, 72, 34)),
    region(`${prefix}-planet-mid`, circle(78 + offset, 72, 25)),
    region(`${prefix}-planet-core`, circle(78 + offset, 72, 16)),
    region(`${prefix}-planet-ring-top`, poly([[30 + offset, 76], [130 + offset, 62], [134 + offset, 66], [34 + offset, 80]])),
    region(`${prefix}-planet-ring-mid`, poly([[34 + offset, 80], [134 + offset, 66], [136 + offset, 70], [36 + offset, 84]])),
    region(`${prefix}-planet-ring-low`, poly([[36 + offset, 84], [136 + offset, 70], [139 + offset, 75], [39 + offset, 89]])),
    region(`${prefix}-moon-shell`, circle(232 - offset * 0.4, 48, 18)),
    region(`${prefix}-moon-mid`, circle(232 - offset * 0.4, 48, 13)),
    region(`${prefix}-moon-core`, circle(232 - offset * 0.4, 48, 8)),
    region(`${prefix}-rocket-nose`, poly([[150, 66], [160, 88], [140, 88]])),
    region(`${prefix}-rocket-upper`, poly([[140, 88], [160, 88], [168, 110], [132, 110]])),
    region(`${prefix}-rocket-lower-left`, poly([[132, 110], [150, 146], [120, 146]])),
    region(`${prefix}-rocket-lower-right`, poly([[168, 110], [180, 146], [150, 146]])),
    region(`${prefix}-rocket-window`, circle(150, 98, 8)),
    region(`${prefix}-rocket-fin-left`, poly([[120, 146], [101, 159], [122, 160]])),
    region(`${prefix}-rocket-fin-right`, poly([[180, 146], [199, 159], [178, 160]])),
    region(`${prefix}-flame-outer`, poly([[132, 146], [168, 146], [150, 198]])),
    region(`${prefix}-flame-mid`, poly([[140, 146], [160, 146], [150, 182]])),
    region(`${prefix}-flame-tip`, poly([[146, 146], [154, 146], [150, 166]])),
    region(`${prefix}-horizon-left`, poly([[0, 178], [82, 158], [140, 170], [0, 220]])),
    region(`${prefix}-horizon-middle`, poly([[82, 158], [200, 176], [150, 220], [40, 220]])),
    region(`${prefix}-horizon-right`, poly([[200, 176], [300, 164], [300, 220], [150, 220]])),
  ];

  return {
    easy: { viewBox: VIEW_BOX, regions: easy },
    medium: { viewBox: VIEW_BOX, regions: medium },
    challenge: { viewBox: VIEW_BOX, regions: challenge },
  };
};

const buildPirateVariants = (prefix: string, offset: number): VariantMap => {
  const easy = [
    region(`${prefix}-sky`, rect(0, 0, 300, 100)),
    region(`${prefix}-sun`, circle(240 - offset, 30, 16)),
    region(`${prefix}-sea`, poly([[0, 100], [300, 100], [300, 170], [0, 170]])),
    region(`${prefix}-sand`, rect(0, 170, 300, 50)),
    region(`${prefix}-ship-hull`, poly([[70, 136], [218, 136], [196, 162], [90, 162]])),
    region(`${prefix}-ship-mast`, rect(140, 84, 10, 52)),
    region(`${prefix}-sail`, poly([[150, 86], [194, 112], [150, 132]])),
    region(`${prefix}-flag`, poly([[150, 84], [177, 90], [150, 96]])),
    region(`${prefix}-chest-body`, rect(218 - offset, 174, 44, 28)),
    region(`${prefix}-chest-lid`, poly([[214 - offset, 174], [264 - offset, 174], [252 - offset, 164], [226 - offset, 164]])),
  ];

  const medium = [
    region(`${prefix}-sky-top`, rect(0, 0, 300, 56)),
    region(`${prefix}-sky-low`, rect(0, 56, 300, 44)),
    region(`${prefix}-sun-glow`, circle(240 - offset, 30, 16)),
    region(`${prefix}-sun-core`, circle(240 - offset, 30, 9)),
    region(`${prefix}-sea-upper`, rect(0, 100, 300, 30)),
    region(`${prefix}-sea-lower`, rect(0, 130, 300, 40)),
    region(`${prefix}-sand-left`, rect(0, 170, 150, 50)),
    region(`${prefix}-sand-right`, rect(150, 170, 150, 50)),
    region(`${prefix}-ship-hull-left`, poly([[70, 136], [148, 136], [142, 162], [90, 162]])),
    region(`${prefix}-ship-hull-right`, poly([[148, 136], [218, 136], [196, 162], [142, 162]])),
    region(`${prefix}-ship-mast`, rect(140, 84, 10, 52)),
    region(`${prefix}-sail-main`, poly([[150, 86], [194, 112], [150, 132]])),
    region(`${prefix}-sail-shadow`, poly([[150, 90], [176, 112], [150, 124]])),
    region(`${prefix}-flag`, poly([[150, 84], [177, 90], [150, 96]])),
    region(`${prefix}-chest-lid`, poly([[214 - offset, 174], [264 - offset, 174], [252 - offset, 164], [226 - offset, 164]])),
    region(`${prefix}-chest-body-top`, rect(218 - offset, 174, 44, 12)),
    region(`${prefix}-chest-body-bottom`, rect(218 - offset, 186, 44, 16)),
    region(`${prefix}-chest-lock`, rect(236 - offset, 184, 8, 12)),
  ];

  const challenge = [
    region(`${prefix}-sky-band-1`, rect(0, 0, 300, 34)),
    region(`${prefix}-sky-band-2`, rect(0, 34, 300, 32)),
    region(`${prefix}-sky-band-3`, rect(0, 66, 300, 34)),
    region(`${prefix}-sun-glow`, circle(240 - offset, 30, 16)),
    region(`${prefix}-sun-mid`, circle(240 - offset, 30, 12)),
    region(`${prefix}-sun-core`, circle(240 - offset, 30, 7)),
    region(`${prefix}-sea-wave-a`, rect(0, 100, 300, 20)),
    region(`${prefix}-sea-wave-b`, rect(0, 120, 300, 20)),
    region(`${prefix}-sea-wave-c`, rect(0, 140, 300, 30)),
    region(`${prefix}-sand-left`, rect(0, 170, 110, 50)),
    region(`${prefix}-sand-mid`, rect(110, 170, 100, 50)),
    region(`${prefix}-sand-right`, rect(210, 170, 90, 50)),
    region(`${prefix}-ship-hull-front`, poly([[70, 136], [120, 136], [112, 162], [90, 162]])),
    region(`${prefix}-ship-hull-mid`, poly([[120, 136], [168, 136], [160, 162], [112, 162]])),
    region(`${prefix}-ship-hull-tail`, poly([[168, 136], [218, 136], [196, 162], [160, 162]])),
    region(`${prefix}-ship-mast`, rect(140, 84, 10, 52)),
    region(`${prefix}-sail-main`, poly([[150, 86], [194, 112], [150, 132]])),
    region(`${prefix}-sail-mid`, poly([[150, 90], [180, 112], [150, 124]])),
    region(`${prefix}-sail-inner`, poly([[150, 96], [166, 112], [150, 118]])),
    region(`${prefix}-flag`, poly([[150, 84], [177, 90], [150, 96]])),
    region(`${prefix}-chest-lid-left`, poly([[214 - offset, 174], [238 - offset, 174], [234 - offset, 164], [226 - offset, 164]])),
    region(`${prefix}-chest-lid-right`, poly([[238 - offset, 174], [264 - offset, 174], [252 - offset, 164], [234 - offset, 164]])),
    region(`${prefix}-chest-top`, rect(218 - offset, 174, 44, 10)),
    region(`${prefix}-chest-mid`, rect(218 - offset, 184, 44, 8)),
    region(`${prefix}-chest-bottom`, rect(218 - offset, 192, 44, 10)),
    region(`${prefix}-chest-lock`, rect(236 - offset, 184, 8, 12)),
  ];

  return {
    easy: { viewBox: VIEW_BOX, regions: easy },
    medium: { viewBox: VIEW_BOX, regions: medium },
    challenge: { viewBox: VIEW_BOX, regions: challenge },
  };
};

const picture = (config: {
  id: string;
  themeId: string;
  title: string;
  description: string;
  isBonus?: boolean;
  thumbnailAsset: string;
  variants: VariantMap;
}): Picture => ({
  ...config,
  isBonus: config.isBonus ?? false,
});

const naturePictures: Picture[] = [
  picture({
    id: 'nature-forest-trail',
    themeId: 'nature',
    title: 'Forest Trail',
    description: 'A calm trail winding through green hills.',
    thumbnailAsset: '/assets/pictures/nature-forest.svg',
    variants: buildNatureVariants('nature-forest-trail', 0),
  }),
  picture({
    id: 'nature-waterfall-hollow',
    themeId: 'nature',
    title: 'Waterfall Hollow',
    description: 'A valley with a bright river and misty ridge.',
    thumbnailAsset: '/assets/themes/nature.svg',
    variants: buildNatureVariants('nature-waterfall-hollow', 8),
  }),
  picture({
    id: 'nature-sunset-grove',
    themeId: 'nature',
    title: 'Sunset Grove',
    description: 'Tall trees and warm sky bands at dusk.',
    thumbnailAsset: '/assets/themes/nature.svg',
    variants: buildNatureVariants('nature-sunset-grove', -10),
  }),
  picture({
    id: 'nature-meadow-song',
    themeId: 'nature',
    title: 'Meadow Song',
    description: 'Rolling meadows with layered trees and river bends.',
    thumbnailAsset: '/assets/themes/nature.svg',
    variants: buildNatureVariants('nature-meadow-song', 14),
  }),
  picture({
    id: 'nature-bonus-emerald-fort',
    themeId: 'nature',
    title: 'Emerald Fort',
    description: 'Bonus canvas unlocked by finishing nature paintings.',
    isBonus: true,
    thumbnailAsset: '/assets/themes/nature.svg',
    variants: buildNatureVariants('nature-bonus-emerald-fort', 20),
  }),
];

const spacePictures: Picture[] = [
  picture({
    id: 'space-launch-day',
    themeId: 'space',
    title: 'Launch Day',
    description: 'A classic rocket taking off beyond an alien horizon.',
    thumbnailAsset: '/assets/pictures/space-launch.svg',
    variants: buildSpaceVariants('space-launch-day', 0),
  }),
  picture({
    id: 'space-moon-drift',
    themeId: 'space',
    title: 'Moon Drift',
    description: 'Rings and moons floating in a deep sky.',
    thumbnailAsset: '/assets/themes/space.svg',
    variants: buildSpaceVariants('space-moon-drift', -12),
  }),
  picture({
    id: 'space-orbit-hub',
    themeId: 'space',
    title: 'Orbit Hub',
    description: 'A bright star lane and a rocket near orbital lights.',
    thumbnailAsset: '/assets/themes/space.svg',
    variants: buildSpaceVariants('space-orbit-hub', 10),
  }),
  picture({
    id: 'space-starlight-dunes',
    themeId: 'space',
    title: 'Starlight Dunes',
    description: 'Colorful planetary dunes under a crowded sky.',
    thumbnailAsset: '/assets/themes/space.svg',
    variants: buildSpaceVariants('space-starlight-dunes', 18),
  }),
  picture({
    id: 'space-bonus-nebula-crown',
    themeId: 'space',
    title: 'Nebula Crown',
    description: 'Bonus cosmic masterpiece with rich segment detail.',
    isBonus: true,
    thumbnailAsset: '/assets/themes/space.svg',
    variants: buildSpaceVariants('space-bonus-nebula-crown', 24),
  }),
];

const piratePictures: Picture[] = [
  picture({
    id: 'pirates-hidden-cove',
    themeId: 'pirates',
    title: 'Hidden Cove',
    description: 'A cozy harbor with a pirate sloop and treasure chest.',
    thumbnailAsset: '/assets/pictures/pirates-cove.svg',
    variants: buildPirateVariants('pirates-hidden-cove', 0),
  }),
  picture({
    id: 'pirates-map-room',
    themeId: 'pirates',
    title: 'Map Room',
    description: 'Sails and sea lines framed by sandy treasure spots.',
    thumbnailAsset: '/assets/themes/pirates.svg',
    variants: buildPirateVariants('pirates-map-room', 8),
  }),
  picture({
    id: 'pirates-storm-sloop',
    themeId: 'pirates',
    title: 'Storm Sloop',
    description: 'A ship cutting through sharper waves at dusk.',
    thumbnailAsset: '/assets/themes/pirates.svg',
    variants: buildPirateVariants('pirates-storm-sloop', -10),
  }),
  picture({
    id: 'pirates-skull-shore',
    themeId: 'pirates',
    title: 'Skull Shore',
    description: 'Golden sand and a chest waiting to be unlocked.',
    thumbnailAsset: '/assets/themes/pirates.svg',
    variants: buildPirateVariants('pirates-skull-shore', 16),
  }),
  picture({
    id: 'pirates-bonus-golden-armada',
    themeId: 'pirates',
    title: 'Golden Armada',
    description: 'Bonus pirate finale with high-detail hull segments.',
    isBonus: true,
    thumbnailAsset: '/assets/themes/pirates.svg',
    variants: buildPirateVariants('pirates-bonus-golden-armada', 24),
  }),
];

export const pictures: Picture[] = [...naturePictures, ...spacePictures, ...piratePictures];

export const themes: Theme[] = [
  {
    id: 'nature',
    name: 'Nature',
    description: 'Forests, meadows, waterfalls, and peaceful skies.',
    accentColor: '#3f9b5c',
    coverAsset: '/assets/themes/nature.svg',
    pictureIds: naturePictures.filter((item) => !item.isBonus).map((item) => item.id),
    bonusPictureId: 'nature-bonus-emerald-fort',
  },
  {
    id: 'space',
    name: 'Space',
    description: 'Rockets, planets, and colorful nebula adventures.',
    accentColor: '#3d63d9',
    coverAsset: '/assets/themes/space.svg',
    pictureIds: spacePictures.filter((item) => !item.isBonus).map((item) => item.id),
    bonusPictureId: 'space-bonus-nebula-crown',
  },
  {
    id: 'pirates',
    name: 'Pirates',
    description: 'Ships, treasure chests, and island discoveries.',
    accentColor: '#c6782f',
    coverAsset: '/assets/themes/pirates.svg',
    pictureIds: piratePictures.filter((item) => !item.isBonus).map((item) => item.id),
    bonusPictureId: 'pirates-bonus-golden-armada',
  },
];

export const pictureById: Record<string, Picture> = pictures.reduce<Record<string, Picture>>((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

export const themeById: Record<string, Theme> = themes.reduce<Record<string, Theme>>((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

export const difficultyLabels: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  challenge: 'Challenge',
};

export const getThemeById = (themeId: string): Theme | undefined => themeById[themeId];

export const getPictureById = (pictureId: string): Picture | undefined => pictureById[pictureId];

export const getThemeRegularPictures = (themeId: string): Picture[] =>
  pictures.filter((item) => item.themeId === themeId && !item.isBonus);

export const getThemeBonusPicture = (themeId: string): Picture | undefined =>
  pictures.find((item) => item.themeId === themeId && item.isBonus);
