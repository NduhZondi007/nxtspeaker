import * as React from 'react';

/** Navy portal sidebar. Nav sets are fixed per role — import them rather than redefining. */
export interface NavItem { label: string; href: string; icon: string }
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  role?: 'CLIENT' | 'SPEAKER' | 'ADMIN';
  userName?: string;
  /** href of the current route — gets the orange left border. */
  active?: string;
  onNavigate?: (href: string) => void;
  assetBase?: string;
}
export function Sidebar(props: SidebarProps): JSX.Element;
export const clientNav: NavItem[];
export const speakerNav: NavItem[];
export const adminNav: NavItem[];
