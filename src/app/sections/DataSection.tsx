import { useEffect, useState } from 'react';
import { Avatar, Badge, Card, Progress, Tabs } from '../../kit';
import { Section } from './shared';

function useDrift(start: number) {
  const [v, setV] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setV((x) => Math.min(100, Math.max(5, x + (Math.random() - 0.45) * 14))), 1400);
    return () => clearInterval(t);
  }, []);
  return Math.round(v);
}

export function DataSection() {
  const cpu = useDrift(48);
  const vram = useDrift(71);
  const [tab, setTab] = useState('overview');
  return (
    <Section id="data" eyebrow="Data display" title="Progress, badges, avatars, tabs">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-6">
          <Progress label="Render queue" value={cpu} />
          <Progress label="VRAM" value={vram} tone="accent" />
          <Progress label="Upload" value={100} tone="success" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge tone="primary" dot>
              Live
            </Badge>
            <Badge tone="accent">Beta</Badge>
            <Badge tone="success">Passing</Badge>
            <Badge tone="danger">3 errors</Badge>
            <Badge tone="neutral">v0.4.0</Badge>
          </div>
        </Card>
        <Card className="space-y-6">
          <Tabs
            label="Team view"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'members', label: 'Members' },
              { id: 'activity', label: 'Activity' },
            ]}
          />
          <div role="tabpanel" aria-label={tab} className="flex flex-wrap items-center gap-5">
            <Avatar name="Ada Lovelace" status="online" />
            <Avatar name="Grace Hopper" status="busy" />
            <Avatar name="Alan Kay" />
            <Avatar name="Margaret Hamilton" status="offline" size={56} />
            <p className="w-full text-sm text-sfx-text/60">
              {tab === 'overview' && 'Four people are editing materials right now.'}
              {tab === 'members' && 'Members can publish materials to the shared library.'}
              {tab === 'activity' && 'Last compile: 2 minutes ago, 0 errors.'}
            </p>
          </div>
        </Card>
      </div>
    </Section>
  );
}
