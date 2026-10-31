/** Sacrament page: avoid background refetch while navigating weeks; cache is updated on save / RSC sync. */
export const SACRAMENT_PAGE_STALE_MS = Number.POSITIVE_INFINITY;
/** Keep inactive adjacent Sundays around (prefetch was GC'd after 30m and caused week-switch skeletons). */
export const SACRAMENT_PAGE_GC_MS = 24 * 60 * 60 * 1000;

export const sacramentQueryKeys = {
  all: ["sacrament"] as const,
  page: (wardId: string, date: string) => [...sacramentQueryKeys.all, "page", wardId, date] as const,
};
