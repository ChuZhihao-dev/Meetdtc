ROUND 1
Seen in one second: Partner Brands heading, followed by three distinct rows of real brand logos.
Idea (one sentence): The existing client marks become the evidence, given their own white field below a separate title.
Live thing: Three continuous rows; pointer hover pauses and keyboard focus exposes wrapped originals.
Layout words by section: partner-brands=heading plus logo wall.
Scores: design 7 · usability 8 · creativity 6 · content 8 → overall 7.2
Caps applied: Existing approved brand gradient retained; this is a scoped section review, not a whole-page acceptance.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Previous title and logo collision: removed from showcase layout; desktop and phone screenshots show separate title space.
2. Previous tinted background weakened logo contrast: local homepage config is white; verified with temporary browser config overrides because the dev server still uses older saved JSON.
3. Logo optical size still varies because source images contain different internal whitespace; uniform slots and maximum heights constrain it without cropping the originals.
Validation limits: Whole-page inspector reports existing unrelated failures. Screenshots use actual preview markup plus local CSS/config injected in the temporary browser session, not a deployed theme. Hover code has syntax validation; live integration awaits source/config synchronization.

ROUND 2 — component refactor
Seen in one second: Separate Partner Brands title and three legible logo rows.
Idea (one sentence): Existing brand marks carry the evidence in a quiet white field.
Live thing: Continuous rows with manual pause, hover pause and keyboard-readable originals.
Layout words by section: partner-brands=stacked title and logo wall.
Scores: design 7.5 · usability 8 · creativity 6 · content 8 → overall 7.4
Caps applied: User-approved gradient retained; whole-homepage inspector failures remain outside this component scope.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Prior collisions and central scrim: removed from component structure; desktop, tablet and mobile show a clear title band.
2. Prior animation rebuilds: row size signatures avoid redundant clone work; rerender and single-listener browser assertions pass.
3. Source logos have different internal whitespace: keep per-image scale controls and constrain with shared slots; optical fine-tuning remains available to merchants.
Verification: Browser fixture uses real preview logo markup with local component CSS and actual local module imported under an isolated test tag. 1440/768/390 widths have no document overflow. Manual pause/resume, hover, repeated updatedCallback, duplicate identity removal, keyboard focus/reset/rebuild and live reduced-motion changes pass. Theme Check adds no findings; node --check passes. Saved Shopify config and Liquid rendering still require synchronization to a development theme for final integration acceptance. No production push performed.
