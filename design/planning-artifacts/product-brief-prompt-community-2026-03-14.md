---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - design/research/vue-github-issues-platform-research.md
  - design/research/wireframe/00-screen-flow-and-interactions.md
  - design/research/wireframe/S01-app-shell-requirements.md
  - design/research/wireframe/S02-master-detail-requirements.md
  - design/research/wireframe/S03-new-prompt-editor-requirements.md
  - design/research/wireframe/S04-version-history-requirements.md
  - design/research/wireframe/S05-admin-panel-requirements.md
  - design/research/wireframe/S06-user-profile-requirements.md
date: 2026-03-14
author: Davor
---

# Product Brief: prompt-community

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

prompt-community is an internal company platform for discovering, sharing, and collaborating on AI prompts, skill files, and reusable instruction sets. Built as a portal app accessible to all company employees (no login required to browse), it solves a specific organizational problem: engineers are learning and using AI in isolation, reinventing the wheel and missing out on each other's best practices.

The platform uses GitHub Issues as its data store (accessed via API) and GitHub OAuth for contributors who want to submit or interact — making it zero-infrastructure while leveraging familiar tooling. The goal is to grow AI literacy across the engineering org, starting with 150 active users.

---

## Core Vision

### Problem Statement

Engineers in the company adopt AI tools individually, with no mechanism to share what works. Effective prompts, reusable skill files, and practical usage patterns stay siloed in personal notes, local files, or private chats — invisible to colleagues who could benefit from them.

### Problem Impact

- AI adoption is slower and shallower than it could be
- Teams duplicate effort building similar prompts independently
- High-quality AI usage patterns never propagate across the org
- New joiners have no reference point for how the company uses AI

### Why Existing Solutions Fall Short

Generic prompt-sharing platforms (PromptBase, GitHub gists, Notion pages) are either public/external, lack structure for skill files and multi-step prompts, have no community interaction layer, or require friction to access. There is no internal, company-native solution that combines discoverability with community feedback signals.

### Proposed Solution

A browseable, searchable internal portal where anyone in the company can:
- Discover prompts, skill files, and grouped skill sets shared by colleagues
- Understand how to use them via structured submission forms and usage instructions
- Vote and comment on contributions to surface quality
- Fork and build on others' work

Contributors authenticate via GitHub OAuth to submit and interact. Anonymous employees can browse and read without any login barrier. All data lives in GitHub Issues (accessed via API), keeping infrastructure costs at zero.

### Key Differentiators

- **Internal & trusted**: Company-scoped, no public noise, content is relevant by default
- **Practical, not theoretical**: Structured for real usage — prompts, skill files, multi-step instructions with context on *how* to use them
- **Zero friction to read**: No login required to browse; contribution requires GitHub auth (existing company tooling)
- **Community quality signals**: Votes and comments let the best content rise naturally
- **AI literacy as a mission**: Not just a repository — a cultural artifact that normalizes sharing AI practices across the org

---

## Target Users

### Primary Users

#### 1. The AI Explorer — "Any Employee Who Wants to Use AI Better"

**Profile:** Any company employee — engineer, analyst, QA, PM — who is curious about AI but doesn't know where to start, or who uses AI tools but hasn't found reliable prompts and workflows yet.

**Motivations:** Find proven prompts and skill files they can use immediately, without having to experiment from scratch. Browse what colleagues are doing with AI and learn by example.

**Current workaround:** Asks colleagues directly (if they know who to ask), searches the web for generic prompt examples, or simply doesn't use AI effectively.

**How they use the platform:**
- Browse anonymously — no login needed
- Search by category, model, or keyword
- Read prompts and usage instructions
- Vote on content they find useful
- Occasionally save or copy prompts they want to reuse

**Aha moment:** Finding a multi-step prompt or skill file that solves exactly the kind of task they do daily — shared by a colleague, with real usage context.

---

#### 2. The AI Practitioner — "The Engineer Who Builds and Shares"

**Profile:** An engineer who has developed effective prompts, skill files, or Claude-style skill workflows and wants to share them with the org. Early adopters of the platform — they seed it with quality content.

**Motivations:** Share what works, get recognition through votes and comments, discover what others are building, fork and improve existing prompts.

**Current workaround:** Shares in Slack threads (lost in history), keeps prompts in personal files, or shares in team wikis with no discoverability.

**How they use the platform:**
- Authenticates via GitHub OAuth to contribute
- Submits prompts, skill files, or grouped skill sets with usage instructions via structured input form
- Adds metadata (category, AI model, difficulty, tags)
- Comments on and forks others' contributions
- Maintains their own submissions (editing, versioning)

**Aha moment:** Seeing their submission get upvotes and comments from colleagues they've never worked with directly — proof that their knowledge is traveling across the org.

---

### Secondary Users

#### 3. The Community Curator / Admin

**Profile:** A trusted community member (typically a senior engineer or tech lead) or a designated platform admin. Their role is lightweight — the community largely self-governs through voting.

**Responsibilities:**
- Remove outdated or low-quality issues that the community has flagged
- Manage labels and categories to keep taxonomy clean
- Feature high-quality submissions to increase visibility
- Occasionally moderate flagged content

**How they use the platform:**
- Access to the Admin Panel for moderation queue and label management
- Can promote community members to curator role
- Intervention is the exception, not the rule — quality surfaces naturally through votes

---

### User Journey

#### The AI Explorer — Discovery to Value

1. **Discovery:** Hears about the platform via internal comms or a colleague sharing a link to a specific prompt
2. **First visit:** Lands on the browse view (no login required) — immediately sees prompts organized by category and model
3. **Engagement:** Finds a relevant prompt, reads it and the usage instructions, copies it to use in their AI tool
4. **Community signal:** Upvotes the prompt — first interaction, no friction
5. **Return:** Bookmarks the platform; returns when they have a new AI task to tackle
6. **Contribution (optional):** Eventually authenticates via GitHub to comment or submit their own prompt

#### The AI Practitioner — Contribution to Recognition

1. **Discovery:** Already knows the platform exists (early adopter or internal announcement)
2. **First submission:** Uses the structured form to submit a prompt or skill file with category, model, difficulty, and usage instructions
3. **Feedback loop:** Receives votes and comments — sees their content is useful
4. **Iteration:** Edits and versions their submission based on feedback
5. **Community identity:** Profile page shows their contributions and vote totals — builds internal reputation as an AI practitioner
6. **Habit:** Checks the platform regularly for new contributions; forks and builds on colleagues' work

---

## Success Metrics

### What Success Looks Like

The platform succeeds when AI knowledge stops being siloed and starts traveling across teams — evidenced by engineers visibly using each other's prompts in their daily work, and leadership noticing this without being told.

### User Success Metrics

| Metric | Target | Signal |
|---|---|---|
| Active users | 150 engineers in first phase | Platform has reached critical mass |
| Daily visit frequency | 3–5 sessions/day per active user | Platform is a daily work habit, not a one-off resource |
| Prompt copy/use rate | Tracked via copy button clicks | Content is actually being used, not just browsed |
| Votes per prompt | Growing vote counts across all categories | Community is engaging, not just consuming |
| Submissions per month | Steady contributor pipeline | Platform is self-sustaining, not just seeded by early adopters |
| Comments per prompt | Active discussion on shared content | Knowledge exchange, not just broadcasting |

### Business Objectives

| Objective | Timeframe | Description |
|---|---|---|
| Reach initial user base | 0–3 months | 150 engineers onboarded and regularly active |
| Establish content library | 0–3 months | Enough quality submissions across categories to be immediately useful to any visitor |
| Cross-team AI visibility | 3–6 months | Leadership observes colleagues referencing and using each other's prompts organically |
| AI literacy uplift | 6–12 months | Broader employee base (non-engineers) actively browsing and adopting shared prompts |

### Key Performance Indicators

**Adoption**
- Monthly Active Users (MAU): target 150+ engineers within 3 months
- % of engineering org reached: target >60% by month 6

**Engagement**
- Average sessions per user per day: target 3–5
- Prompt copy rate: % of detail views that result in a copy action
- Return rate: % of users who return within 7 days of first visit

**Content Health (by category: Engineering, Business, General)**
- Total prompts per category
- Average votes per prompt per category — rising trend indicates quality and relevance
- Active contributors per month: target 20+ unique submitters by month 3

**Community Signal**
- Comments per prompt (average)
- Fork/reuse rate: prompts that get forked or directly referenced in new submissions
- Qualitative: leadership unprompted observations of cross-team prompt sharing

---

## MVP Scope

### Core Features

All six screens from the wireframe specification are in scope for MVP.
This is a full-featured v1, not a stripped-down prototype.

#### S01 — App Shell
- Persistent navbar with global search (⌘K, MiniSearch client-side index)
- Collapsible sidebar with category, AI model, and sort filters
- GitHub OAuth sign-in (popup flow via Cloudflare Worker)
- Notification bell with drawer
- Anonymous read access — no login required to browse
- Responsive layout (desktop, tablet, mobile)
- Keyboard shortcuts (⌘K, [, G+B, G+N)

#### S02 — Browse & Discover (Master-Detail)
- Resizable split-pane: filterable prompt list (left) + full detail (right)
- Prompt cards with metadata: category, AI model, difficulty, vote count, comments
- Rendered markdown with syntax-highlighted code blocks (shiki)
- Reactions/voting (👍 ❤️ 🚀) with optimistic updates
- Comment thread with composer (authenticated) or sign-in CTA (anonymous)
- Copy, Fork, History, Share action buttons
- Infinite scroll with skeleton loading states
- Empty and error states

#### S03 — Prompt Editor
- Create and edit prompts, skill files, and grouped skill sets
- Structured metadata form: category, AI model, difficulty, tags (max 5)
- Markdown editor with toolbar + live preview pane (55/45 split)
- Auto-save draft to localStorage every 30 seconds
- Image upload via Cloudflare R2 (drag-drop or click)
- YAML frontmatter generated on publish → stored as GitHub Issue body
- Unsaved changes guard with Save/Discard/Cancel dialog
- Keyboard shortcuts (⌘S save, ⌘↵ publish)
- Mobile tab-based layout (Write | Preview)

#### S04 — Version History
- Full timeline of all prompt versions (parsed from GitHub issue comments)
- Side-by-side and unified diff view with colour-coded line changes
- Restore previous version (author or maintainer only) with confirmation
- Version metadata: author, date, changelog message, +/- line counts
- Raw markdown toggle, version A/B selectors

#### S05 — Admin Panel (Maintainer only)
- Stats overview: total prompts, flagged, featured counts
- Moderation queue: approve, hide, or delete flagged prompts with bulk actions
- Label manager: add, edit, delete GitHub labels with prefix conventions
- Featured prompts management
- Moderation log with action history and date filtering
- Access control: non-maintainers redirected immediately

#### S06 — User Profile
- Public profile: avatar, bio, GitHub link, stats (prompts, votes, comments)
- Submitted prompts grid with sort (Most Voted / Newest)
- Saved/bookmarked prompts tab (own profile only, localStorage)
- Activity tab: recent comments and interactions
- Edit Profile link (redirects to GitHub settings)
- Own vs. other profile view distinction

#### Infrastructure & Backend
- GitHub Issues as data store (GraphQL reads, REST writes via Octokit)
- ETag-based caching + TanStack Vue Query (stale-while-revalidate)
- Client-side search index (MiniSearch) — no GitHub Search API dependency
- Cloudflare Pages (hosting) + Workers (OAuth proxy, image upload) + R2 (images)
- Two-repo architecture: app repo + data repo (GitHub Issues)

---

### Out of Scope for MVP

- Native mobile app (responsive web covers mobile)
- Non-GitHub authentication — GitHub OAuth is the only auth method
- AI-powered prompt recommendations or search ranking
- Direct in-platform prompt testing against AI models
- Email or Slack notifications (in-app notification drawer only)
- Team/squad-specific spaces or collections
- Analytics dashboard beyond admin stats bar
- Public-facing (external) access — internal company portal only

---

### MVP Success Criteria

The MVP is validated when:
- 150 engineers are actively using the platform (MAU)
- Users average 3–5 sessions per day
- 20+ unique contributors have submitted prompts across Engineering, Business, and General categories
- Leadership observes cross-team prompt sharing organically
- Content library is self-sustaining: new submissions arrive weekly without admin intervention

---

### Future Vision

- **AI-assisted discovery**: Potentially surface relevant prompts based on role or browsing behaviour — to be evaluated once usage data is available
- **Team collections**: Curated prompt sets per squad or domain (e.g., "QA Team Toolkit", "Backend Engineers") to help teams build their own focused libraries within the shared platform
- **Integration hooks**: Push new or featured prompts to internal channels (Slack, Teams, wikis) — valuable but complex; deferred until core platform is stable and adoption is proven
