export const InheritancePolicy = {
  NONE: "NONE",
  FULL: "FULL",
  SELECTIVE: "SELECTIVE",
  OVERRIDABLE: "OVERRIDABLE",
};

export type InheritancePolicy =
  (typeof InheritancePolicy)[keyof typeof InheritancePolicy];
