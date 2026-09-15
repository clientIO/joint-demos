# Mermaid Editor

Design context for the demo. Inferred from the brief and the reference
(mermaid.ai), not confirmed with the team: edit freely.

## Register

product

## Users

Developers evaluating JointJS+ from the changelog gallery, on a laptop next to
the docs, in daylight. They type Mermaid on the left and watch the diagram
redraw on the right; a designer or PM may be looking over their shoulder.

## Product Purpose

Show that JointJS+ can be the rendering and editing layer for Mermaid:
the source stays the single source of truth, every canvas gesture writes back
into it, and the result is a real editor rather than a viewer.

## Brand Personality

Quiet, precise, code-first. The chrome recedes; the diagram and the source
are the product. One JointJS red accent for the mark and for pressed state,
never for decoration.

## Anti-references

- Generic AI SaaS: gradients, glass, glow borders, purple-to-blue.
- Toolbars built from boxes inside boxes.
- Playful or "creative tool" styling; this is a developer instrument.

## Design Principles

1. The diagram is the code, drawn: node labels, edge labels and the source
   share one monospace face.
2. Flat chrome, hairline structure. Sections are separated by dividers and
   spacing, not by nested wells.
3. Dark mode is navy, not grey, and a few steps up from black.
4. State is spoken once: pressed is a tinted fill, focus is the blue ring,
   danger is red only on hover.

## Accessibility & Inclusion

WCAG AA text contrast on both themes, keyboard-operable everywhere (the
canvas and every toolbar), reduced motion respected, no colour-only state.
