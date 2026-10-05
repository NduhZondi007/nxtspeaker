import * as React from 'react';

/** Discovery filter bar — search, sort, and an expandable panel of expertise / availability / format / fee controls. */
export interface FilterState {
  search: string;
  expertise: string[];
  available: boolean | null;
  format: '' | 'in-person' | 'virtual' | 'hybrid';
  minFee: number;
  maxFee: number;
  sort: 'fee_asc' | 'fee_desc' | 'rating_desc' | 'events_desc';
}
export interface SpeakerFiltersProps extends React.HTMLAttributes<HTMLDivElement> {
  filters?: Partial<FilterState>;
  onChange?: (next: FilterState) => void;
}
export function SpeakerFilters(props: SpeakerFiltersProps): JSX.Element;
/** The twelve expertise tags the platform ships with. */
export const ALL_EXPERTISE: string[];
