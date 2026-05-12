/** Sacrament page: avoid background refetch while navigating weeks; cache is updated on save / RSC sync. */
export const SACRAMENT_PAGE_STALE_MS = Number.POSITIVE_INFINITY;

export const sacramentQueryKeys = {
  all: ["sacrament"] as const,
  page: (wardId: string, date: string) => [...sacramentQueryKeys.all, "page", wardId, date] as const,
};
