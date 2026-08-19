import type { RootState } from "./store";
import type { RegistryKind } from "./features/registry/registryThunk";

export const selectRegistry = (state: RootState) => state.registry;
export const selectRegistryKind = (kind: RegistryKind) => (state: RootState) => state.registry[kind];
export const selectRegistration = (state: RootState) => state.registration;
export const selectPayment = (state: RootState) => state.payment;
export const selectAssessment = (state: RootState) => state.assessment;
