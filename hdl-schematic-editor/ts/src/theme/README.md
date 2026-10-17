# JointJS+ theme: minimal

A flat, minimal look for the JointJS+ components - the toolbar, the inspector, the stencil, the selection, the free
transform, the snaplines, the link tools, the navigator, the tooltip, the context toolbar and the dialog - styled from
scratch on design tokens, in light and dark. Inspired by [shadcn/ui](https://ui.shadcn.com) (MIT): the tokens have the
names of its CSS variables, so an app using them gets matching components.

## Usage

Copy this folder into the app, then:

```css
@import '@joint/plus/joint-plus.css' layer(joint);
@import './theme/tokens.css';
@import './theme/theme-minimal.css' layer(theme);
```

```ts
import { setTheme } from '@joint/plus';

setTheme('minimal');
```

Every rule is scoped to `.joint-theme-minimal`: the components of another theme are not touched. In its layer, the
styles of the app (not layered) override it whatever the specificity of their selectors.

The dark scheme: `data-color-scheme="dark"` on the root element (`document.documentElement.dataset.colorScheme = 'dark'`).

## Tokens

`tokens.css` defines them (an app with its own tokens of the same names can skip it):

| Token | Use |
|---|---|
| `--background`, `--foreground` | the surfaces and the text |
| `--muted`, `--muted-foreground` | the hovered items, the secondary text and icons |
| `--border`, `--input` | the lines, the borders of the inputs and buttons |
| `--primary`, `--primary-foreground` | the toggles, the sliders, the tooltip |
| `--ring`, `--ring-strong` | the focus |
| `--selection` | the selection, the handles, the snaplines, the visible area of the navigator |
| `--radius`, `--radius-md`, `--radius-sm` | the corners |
| `--shadow-xs`, `--shadow-md` | the buttons, the popovers |
| `--font` | the text |
| `--icon-search`, `--icon-close`, `--icon-chevron`, `--icon-trash`, `--icon-zoom-in`, `--icon-zoom-out`, `--icon-undo`, `--icon-redo` | the icons of the components (`icons/`, [Lucide](https://lucide.dev), ISC): masks in the color of the text |

The icons of the built-in tools of the toolbar (`zoomIn`, `zoomOut`, `undo`, `redo`) are set; another button gets
an icon by `--icon`, from a variable of the app (e.g. `.joint-toolbar [data-name="save"] { --icon: var(--icon-save); }`).
