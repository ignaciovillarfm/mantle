export const PROGRAM_TEMPLATE_KEYS = [
  "ward.releases.default",
  "ward.sustainings.default",
  "ward.new_members.default",
  "ward.ordination.deacon",
  "ward.ordination.teacher_priest",
] as const;

export type ProgramTemplateKey = (typeof PROGRAM_TEMPLATE_KEYS)[number];
