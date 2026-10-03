// Stage & primitives
export { Stage } from './stage/Stage';
export type { StageProps } from './stage/Stage';
export { Layer } from './stage/Layer';
export type { LayerProps } from './stage/Layer';
export { Surface } from './stage/Surface';
export { useSurface } from './stage/useSurface';
export { useStage } from './stage/context';

// Engine
export { Renderer } from './gpu/Renderer';
export type { SurfaceOptions, LayerOptions, MaterialResult, CompileMessage, RendererStats, ContentSource, Quality } from './gpu/Renderer';
export { BUILTIN_MATERIALS, MATERIAL_DEFAULTS } from './gpu/wgsl/materials';
export type { BuiltinMaterial } from './gpu/wgsl/materials';
export { CONTENT_FX } from './gpu/wgsl/content';
export type { ContentFx } from './gpu/wgsl/content';
export { detectSupport } from './gpu/support';
export type { SupportReport } from './gpu/support';

// Theme
export { THEMES, THEME_TOKENS } from './theme';
export type { ThemeName, ThemeToken } from './theme';

// Components
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant } from './components/Button';
export { Card } from './components/Card';
export type { CardProps } from './components/Card';
export { Input, Textarea, Switch, Slider, Checkbox } from './components/Field';
export { Badge, Progress, Avatar, Tabs } from './components/Display';
export type { Tone, TabItem } from './components/Display';
export { Modal, Select, Tooltip } from './components/Overlay';

export { cn } from './util';
