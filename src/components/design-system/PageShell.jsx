import React from 'react';

export function PageShell({ children, className = '' }) {
  return <main className={`v-page-shell v-stack ${className}`.trim()}>{children}</main>;
}

export function SectionCard({ children, className = '' }) {
  return <section className={`v-card v-card--soft ${className}`.trim()}>{children}</section>;
}
