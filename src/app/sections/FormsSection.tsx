import { useState } from 'react';
import { AtSign, Search } from 'lucide-react';
import { Button, Card, Checkbox, Input, Modal, Select, Slider, Switch, Textarea } from '../../kit';
import { Section } from './shared';

export function FormsSection() {
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<'starter' | 'pro' | 'studio'>('pro');
  const [gpu, setGpu] = useState(72);
  const [open, setOpen] = useState(false);
  const emailError = email && !email.includes('@') ? 'That does not look like an email address.' : undefined;

  return (
    <Section
      id="forms"
      eyebrow="Forms"
      title="Inputs that stay inputs"
      description="Caret, selection, IME, autofill and keyboard navigation all come from the browser. The GPU only paints them."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card padding="lg">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
          >
            <Input label="Search" placeholder="Search components" icon={<Search className="h-4 w-4" />} />
            <Input
              label="Email"
              type="email"
              placeholder="you@studio.dev"
              icon={<AtSign className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              hint="We only use it for the confirmation."
            />
            <Select
              label="Plan"
              value={plan}
              onChange={setPlan}
              options={[
                { value: 'starter', label: 'Starter' },
                { value: 'pro', label: 'Pro' },
                { value: 'studio', label: 'Studio' },
              ]}
            />
            <Textarea label="Message" placeholder="Tell us what you are building" />
            <div className="flex justify-end">
              <Button type="submit" variant="neon">
                Send
              </Button>
            </div>
          </form>
        </Card>
        <Card padding="lg" className="space-y-7">
          <Switch label="Email notifications" description="A real role=switch button" defaultChecked />
          <Switch label="Auto-save drafts" description="Space or Enter toggles it from the keyboard" />
          <Switch label="Locked" description="Disabled state" disabled />
          <Slider label="GPU budget" value={gpu} onChange={setGpu} format={(v) => `${v}%`} />
          <Slider label="Refraction" defaultValue={40} />
          <div className="space-y-3">
            <Checkbox label="Accept the terms" defaultChecked />
            <Checkbox label="Send me shader news" />
          </div>
        </Card>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Message sent"
        description="The page behind this dialog is blurred and refracted by the GPU, not by CSS."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </>
        }
      >
        <Input label="Reference" defaultValue="SFX-2026-1003" readOnly />
      </Modal>
    </Section>
  );
}
