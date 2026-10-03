import React from 'react';

export const SECTIONS = [
  { id: 'components', label: 'Components' },
  { id: 'forms', label: 'Forms' },
  { id: 'materials', label: 'Materials' },
  { id: 'effects', label: 'Live HTML FX' },
  { id: 'data', label: 'Data' },
  { id: 'studio', label: 'Studio' },
] as const;

export function Section({
  id,
  eyebrow,
  title,
  children,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-8">
      <header className="max-w-2xl space-y-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-sfx-primary">{eyebrow}</p>
        <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight text-sfx-text sm:text-3xl">
          {title}
        </h2>
        {description && <p className="text-sm leading-relaxed text-sfx-text/60">{description}</p>}
      </header>
      {children}
    </section>
  );
}
