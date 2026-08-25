// Shared Markdown renderer (GFM), ported from the AI workflow builder demo so the
// sticky notes format the same way. View-only: the note card swaps a raw <textarea>
// in when editing.
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';

const REMARK_PLUGINS = [remarkGfm];

const COMPONENTS: Components = {
    // Destructuring drops react-markdown's `node` prop so it isn't forwarded to the DOM.
    a({ children, href }) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        );
    },
};

// Tables take w-max + never wrap, so a wide table scrolls horizontally in its box
// instead of squeezing the cells. Note surfaces carry their own ink, so callers can
// re-assert header/blockquote colors via `className` (see note-card) rather than the
// muted grey used on neutral surfaces.
const MARKDOWN_CLASS =
  'text-sm leading-relaxed [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-semibold ' +
  '[&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:font-semibold ' +
  '[&_p]:mb-2 [&_p]:break-words [&_li]:break-words ' +
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-current/30 [&_blockquote]:pl-3 [&_blockquote]:opacity-80 ' +
  '[&_table]:mt-2 [&_table]:w-max [&_table]:border-collapse ' +
  '[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-current/30 [&_th]:py-1.5 [&_th]:pr-4 [&_th]:text-left [&_th]:align-bottom ' +
  '[&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide ' +
  '[&_td]:whitespace-nowrap [&_td]:border-b [&_td]:border-current/20 [&_td]:py-1.5 [&_td]:pr-4 [&_td]:align-top ' +
  '[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:text-[0.85em] ' +
  '[&_a]:underline [&_a]:underline-offset-2';

export function MarkdownView({
    markdown,
    className,
}: {
  readonly markdown: string;
  readonly className?: string;
}) {
    return (
        <div className={cn(MARKDOWN_CLASS, className)}>
            <Markdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
                {markdown}
            </Markdown>
        </div>
    );
}
