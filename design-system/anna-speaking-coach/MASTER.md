# Anna Speaking Coach — interface system

Generated guidance: UI UX Pro Max, verified query `adult learning productivity dashboard` and Next.js stack search `accessible navigation forms`. The initial children's education match was rejected.

## Product interpretation

An adult IELTS practice workspace. Adopt the matched flat, typography-led productivity style, teal focus palette and accessible interaction guidance. Marketing patterns and children's typography do not fit this authenticated learning tool.

## Tokens

- Canvas: #f7f8f4; surface: #ffffff; ink: #182e2a; muted text: #60706b; border: #dce4dd.
- Brand/action: #176b55 with white text; brand tint: #eaf3ec; secondary accent: #b7522a.
- Keep the existing Inter font to preserve Vietnamese coverage and avoid adding another font request. Use a system fallback.
- Spacing: 4px base; 20–28px cards; 32px section gaps; maximum content width 1152px.
- Cards: 16px radius, quiet 1px border, no ornamental shadows or gradients.
- Controls: minimum 44px hit area, visible 3px focus outline, labels for all fields, clear loading/error/empty states.
- Motion: color transitions only by default; respect prefers-reduced-motion.

## Navigation and page hierarchy

Desktop sidebar; five-item mobile bottom navigation with safe-area padding. Active routes use aria-current, icons use Lucide, decorative icons are hidden from assistive technology. All pages use one H1 and the same page-header/surface/button/field vocabulary. A skip link targets main-content.

Dashboard prioritizes today's practice and real progress. Question discovery retains shared/custom isolation. Recording retains pause/resume, review, authenticated playback and analysis. Mock tests show completion without promising official exam timing or unavailable pronunciation grades. Authentication retains password and Google flows.

## Acceptance

Existing recorder tests, TypeScript check and production build pass. Inspect 375, 768, 1024 and 1440px layouts and keyboard navigation. Do not fabricate practice data, testimonials or grades. Do not run development and production builds against the same output directory simultaneously.
