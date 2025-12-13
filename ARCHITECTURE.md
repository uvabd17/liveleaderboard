# System Architecture - Feature Toggle System

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Event                                               │   │
│  │  - id, name, slug                                   │   │
│  │  - features: JSON (22 toggleable features)          │   │
│  │  - rules: JSON (judging, rubric, rounds)            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Score                                               │   │
│  │  - value: Int                                       │   │
│  │  - comment: String? (Judge feedback)                │   │
│  │  - updatedAt: DateTime (Score history)              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                ┌───────────┴────────────┐
                │                        │
┌───────────────▼──────────┐  ┌──────────▼──────────────┐
│     API LAYER            │  │   TYPE SYSTEM           │
│                          │  │                         │
│ /api/event/settings      │  │ lib/features.ts         │
│  - GET: Load features    │  │  - EventFeatures        │
│  - PUT: Save features    │  │  - defaultFeatures      │
│                          │  │  - featureMetadata      │
│ /api/judge/score         │  │  - mergeFeatures()      │
│  - POST: Save scores +   │  │  - getFeatureValue()    │
│    comments              │  │  - setFeatureValue()    │
└──────────┬───────────────┘  └─────────┬───────────────┘
           │                            │
           │                            │
┌──────────▼────────────────────────────▼──────────────────┐
│                    ADMIN INTERFACE                       │
│                                                          │
│  /admin/settings                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  Feature Configuration UI                      │    │
│  │  - 22 toggleable features                      │    │
│  │  - Grouped by priority & category              │    │
│  │  - Interactive config options                  │    │
│  │  - Save/Reset functionality                    │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────┘
                          │
                          │ Features loaded via API
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
┌─────▼────────┐  ┌───────▼──────┐  ┌────────▼────────┐
│ LEADERBOARD  │  │    STAGE     │  │     JUDGE       │
│              │  │              │  │                 │
│ /leaderboard │  │   /stage     │  │    /judge       │
│              │  │              │  │                 │
│ Features:    │  │ Features:    │  │ Features:       │
│ • Podium     │  │ • Large      │  │ • Comments      │
│ • Momentum   │  │   Typography │  │ • Per-criterion │
│ • SSE        │  │ • Top 10     │  │ • General       │
└──────────────┘  └──────────────┘  └─────────────────┘
```

## 📊 Data Flow

### Feature Configuration Flow
```
1. Admin visits /admin/settings
2. Toggles features ON/OFF
3. Configures options (e.g., podium top N)
4. Clicks "Save Settings"
5. PUT /api/event/settings { features: {...} }
6. Database updates Event.features JSON
7. Success message displayed
```

### Feature Usage Flow
```
1. User visits /leaderboard
2. Component mounts
3. GET /api/event/settings
4. Receives features configuration
5. mergeFeatures(stored) with defaults
6. Conditional rendering based on features
   - if (features.presentation.podiumWinners.enabled)
   - Show podium button
7. User clicks "Show Podium"
8. Display top N winners with animations
```

### Real-time Update Flow
```
1. SSE connection established
2. Judge submits score
3. Hub broadcasts update
4. Leaderboard receives SSE event
5. Updates ranks and scores
6. Checks for momentum (2+ improvements)
7. If enabled: Shows 🔥 indicator
8. Animates rank changes
```

## 🔄 Feature Gate Pattern

```typescript
// 1. Load features
const [features, setFeatures] = useState<EventFeatures | null>(null);

useEffect(() => {
  fetch('/api/event/settings')
    .then(r => r.json())
    .then(data => setFeatures(mergeFeatures(data.features)));
}, []);

// 2. Conditional rendering
{features?.presentation.podiumWinners.enabled && (
  <PodiumView topN={features.presentation.podiumWinners.topN} />
)}

// 3. Feature-specific logic
if (features?.competitive.momentumIndicators) {
  // Track momentum
  if (consecutiveImprovements >= 2) {
    showFireEmoji = true;
  }
}
```

## 🗺️ Route Structure

```
/
├── /admin
│   ├── /admin/settings ⭐ NEW - Feature configuration
│   ├── /admin/rounds
│   └── /admin/rubric
│
├── /leaderboard ✨ ENHANCED - Podium + Momentum
├── /stage ⭐ NEW - Projector display
├── /embed ⭐ NEW - Embed code generator
│
├── /judge ✨ ENHANCED - Comments support
├── /judge/access
│
├── /kiosk
└── /register

API Routes:
├── /api/event/settings ✨ ENHANCED - GET/PUT features
├── /api/judge/score ✨ ENHANCED - Comments support
├── /api/rounds
├── /api/scoring-schema
└── /api/sse
```

## 🎯 Feature Categories

```
EventFeatures (22 features)
│
├── Presentation (4)
│   ├── teamAvatars
│   ├── stageDisplay ✅
│   ├── customThemes
│   └── podiumWinners ✅ { enabled, topN }
│
├── Competitive (4)
│   ├── publicVoting { enabled, weight }
│   ├── liveReactions
│   ├── badgesAchievements
│   └── momentumIndicators ✅
│
├── JudgeExperience (3)
│   ├── judgeComments ✅
│   ├── bulkScoring
│   └── scoreHistory ✅ (DB ready)
│
├── LeaderboardVisibility (3)
│   ├── scoreBreakdown { enabled, detail }
│   ├── activityFeed
│   └── historicalComparison
│
└── Operations (8)
    ├── scheduledActions
    ├── i18n { enabled, languages }
    ├── embedSupport ✅
    ├── teamMessaging
    ├── predictiveRankings
    ├── printViews
    ├── participantProfiles
    └── exportOnDemand
```

## 🔐 Security Model

```
┌─────────────────────────────────────────┐
│         Client (Browser)                │
│  - Loads features via authenticated API │
│  - Cannot directly modify features      │
│  - Feature flags guide UI rendering     │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────┐
│         API Layer                       │
│  - Validates authentication             │
│  - Enforces feature permissions         │
│  - Stores in database JSON              │
└──────────────┬──────────────────────────┘
               │
               │
┌──────────────▼──────────────────────────┐
│         Database (Postgres)             │
│  - Event.features: JSON                 │
│  - Single source of truth               │
│  - Atomic updates                       │
└─────────────────────────────────────────┘
```

## 🎨 UI Component Hierarchy

```
AdminSettingsPage
│
├── Feature Section (High Priority)
│   ├── FeatureCard (Presentation)
│   │   ├── Toggle Switch
│   │   └── Config Options
│   │       └── Select (Podium top N)
│   │
│   ├── FeatureCard (Competitive)
│   │   ├── Toggle Switch
│   │   └── Config Options
│   │       └── Number Input (Voting weight)
│   │
│   └── FeatureCard (Judge Experience)
│       └── Toggle Switch
│
├── Feature Section (Medium Priority)
│   └── FeatureCard (Operations)
│       ├── Toggle Switch
│       └── Config Options
│           └── MultiSelect (Languages)
│
└── Action Bar
    ├── Reset Button
    └── Save Button
```

## 💾 Database Schema

```sql
-- Event table with features JSON
CREATE TABLE Event (
  id TEXT PRIMARY KEY,
  features JSONB, -- All 22 feature configs
  rules JSONB,    -- Judging mode, rubric, rounds
  -- ... other fields
);

-- Score table with comments
CREATE TABLE Score (
  id TEXT PRIMARY KEY,
  value INTEGER,
  comment TEXT,      -- Judge feedback ⭐ NEW
  updatedAt TIMESTAMP, -- History tracking ⭐ NEW
  -- ... other fields
);

-- Example features JSON structure:
{
  "presentation": {
    "podiumWinners": {
      "enabled": true,
      "topN": 5
    },
    "teamAvatars": false,
    "stageDisplay": false,
    "customThemes": false
  },
  "competitive": {
    "momentumIndicators": true,
    "publicVoting": {
      "enabled": false,
      "weight": 20
    },
    ...
  },
  ...
}
```

## 🚀 Deployment Considerations

```
Development:
- All features accessible
- No authentication on settings
- Test mode enabled

Production:
- Add authentication to /admin/settings
- Role-based access control
- Feature flag persistence
- Audit logging for changes
- Rate limiting on API
```

## 📈 Performance Profile

```
Feature Loading:
- Single API call on component mount
- Cached in React state
- No re-fetching unless forced

Feature Checking:
- O(1) property access
- No computation overhead
- Minimal bundle size impact

Real-time Updates:
- SSE connection maintained
- Feature checks don't block updates
- Conditional rendering optimized
```

---

**Legend:**
- ⭐ NEW - Newly created
- ✨ ENHANCED - Modified/enhanced
- ✅ READY - Fully functional
