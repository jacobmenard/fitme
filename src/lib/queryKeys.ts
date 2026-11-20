export const queryKeys = {
  me: ['me'] as const,
  tryOn: (id: string) => ['try-on', id] as const,
  tryOns: (savedOnly: boolean) => ['try-ons', { savedOnly }] as const,
};
