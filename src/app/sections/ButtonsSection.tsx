import { useState } from 'react';
import { Heart, Settings, Trash2, Zap } from 'lucide-react';
import { Button, Card, Tooltip } from '../../kit';
import { Section } from './shared';

export function ButtonsSection() {
  const [loading, setLoading] = useState(false);
  const [likes, setLikes] = useState(0);
  return (
    <Section
      id="components"
      eyebrow="Components"
      title="Buttons"
      description="Native <button> elements. Each variant is a material; press any of them to send a ripple through its own label."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="space-y-5">
          <h3 className="text-sm font-medium text-sfx-text/70">Variants</h3>
          <div className="flex flex-wrap gap-3">
            <Button>Glass</Button>
            <Button variant="neon">
              <Zap className="h-4 w-4" /> Neon
            </Button>
            <Button variant="plasma">Plasma</Button>
            <Button variant="solid">Solid</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </Card>
        <Card className="space-y-5">
          <h3 className="text-sm font-medium text-sfx-text/70">Sizes and states</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Tooltip content="Settings (tooltip on its own layer)">
              <Button size="icon" variant="ghost" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1600);
              }}
            >
              {loading ? 'Saving' : 'Save changes'}
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="plasma" onClick={() => setLikes((n) => n + 1)} aria-label={`Like, ${likes} likes`}>
              <Heart className="h-4 w-4" /> {likes}
            </Button>
          </div>
        </Card>
      </div>
    </Section>
  );
}
