import { PaintingSession, SvgVariant } from '../models/domain';

export interface PaintProgress {
  filledCount: number;
  totalCount: number;
  percent: number;
}

export const getPaintProgress = (session: PaintingSession, variant: SvgVariant): PaintProgress => {
  const totalCount = variant.regions.length;
  const filledCount = variant.regions.reduce((count, region) => {
    const color = session.fills[region.id];
    return color ? count + 1 : count;
  }, 0);

  return {
    filledCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100),
  };
};
