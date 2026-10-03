import { ArrowRight, Code2 } from 'lucide-react';
import { Badge, Button, Card } from '../../kit';

export function Hero({ onExplore, onStudio }: { onExplore: () => void; onStudio: () => void }) {
  return (
    <Card material="aurora" padding="lg" fx="ripple" fxAmount={0.45} className="overflow-hidden rounded-[2rem] py-16 sm:px-14 sm:py-20">
      <div className="max-w-3xl space-y-6">
        <Badge tone="accent" dot>
          HTML-in-Canvas × WebGPU
        </Badge>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Real HTML.
          <br />
          <span className="text-sfx-primary">Painted by shaders.</span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-sfx-text/70">
          Every element on this page is laid out, focusable and readable by screen readers as normal HTML, but its
          pixels come from a single WebGPU pipeline. Glass refracts what is really behind it, and effects ripple,
          warp and dissolve the live content itself. Move your pointer over this text.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="lg" onClick={onExplore}>
            Explore components <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="neon" onClick={onStudio}>
            <Code2 className="h-4 w-4" /> Write a material
          </Button>
        </div>
      </div>
    </Card>
  );
}
