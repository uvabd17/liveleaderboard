# Live Leaderboard - User Guide

## 📖 Overview

This guide covers all user roles and use cases for the Live Leaderboard system. Whether you're organizing an event, judging a competition, participating in a hackathon, or viewing results, this guide has you covered.

---

## 👥 User Roles

### 1. 🎯 Event Organizer/Admin
**What you can do:** Full control over events, participants, features, and judging

### 2. 👨‍⚖️ Judge
**What you can do:** Score participants, leave feedback, view scoring interface

### 3. 👤 Participant (Team/Individual)
**What you can do:** Register, view leaderboard, see your rank and scores

### 4. 👀 Audience/Viewer
**What you can do:** Watch live leaderboard, see real-time updates, react (if enabled)

---

# 🎯 Event Organizer/Admin Guide

## Getting Started

### Initial Setup

1. **Access Admin Panel**
   - Navigate to `/admin`
   - You'll see the main admin dashboard

2. **Configure Event Features**
   - Click **⚙️ Feature Settings** button
   - Enable desired features for your event type
   - Configure feature-specific options
   - Click **Save Settings**

### Recommended Feature Sets

#### 🏫 **Academic Competition**
Enable:
- ✅ Podium/Winners View (Top 3)
- ✅ Judge Comments
- ✅ Stage Display Mode
- ✅ Score Breakdown Detail

#### 💻 **Hackathon**
Enable:
- ✅ Momentum Indicators
- ✅ Podium/Winners View (Top 10)
- ✅ Judge Comments
- ✅ Embed Support
- ✅ Stage Display Mode

#### 🎪 **Public Event**
Enable:
- ✅ Stage Display Mode
- ✅ Public Voting (if interactive)
- ✅ Live Reactions
- ✅ Embed Support
- ✅ Podium/Winners View (Top 5)

#### 🏢 **Professional Conference**
Enable:
- ✅ Stage Display Mode
- ✅ Podium/Winners View (Top 3)
- ✅ Embed Support
- ✅ Score Breakdown Detail

## Managing Participants

### Onboarding Teams/Individuals

1. **Navigate to Admin Panel** (`/admin`)

2. **Generate QR Codes**
   - Click **👥 Team QR** for team registration
   - Click **👤 Individual QR** for individual registration
   - QR code appears on screen

3. **Share Registration**
   - **Option A:** Display QR code on screen for participants to scan
   - **Option B:** Send registration link manually
   - **Option C:** Use kiosk mode (`/kiosk`) for self-service

4. **Monitor Registrations**
   - Participants appear in the list as they register
   - See real-time updates via SSE (Server-Sent Events)

### Viewing Participants

- **Admin Panel:** See all participants with current scores
- **Conflict Detection:** Watch for ⚠️ badges indicating judge disagreement
- **Last Update:** Timestamp shows when leaderboard was last updated

## Configuring Judging

### Setting Judging Mode

1. **Navigate to Admin Panel** (`/admin`)

2. **Choose Mode:**
   - **📊 Aggregate Visible:** Judges can see current totals
     - Use for: Collaborative judging, transparency
   - **🔒 Blinded:** Judges cannot see other scores
     - Use for: Independent assessment, bias reduction

3. **Select mode** from dropdown

4. **Mode updates automatically** for all judges

### Creating Scoring Rubric

1. **Navigate to Rubric Configuration** (`/admin/rubric`)

2. **Define Criteria:**
   - Add scoring criteria (e.g., Innovation, Impact, Technical)
   - Set maximum points per criterion
   - Configure weights (if using weighted scoring)
   - Add descriptions to guide judges
   - Mark required vs optional criteria

3. **Per-Round Criteria** (Advanced)
   - Specify which criteria apply to which rounds
   - Example: "Pitch" criteria only in Round 1

4. **Scale Options:**
   - **Number Input:** Free-form 0-max entry
   - **Range Slider:** Visual slider selection
   - **Radio Buttons:** Fixed point values (0, 25, 50, 75, 100)

### Managing Rounds

1. **Navigate to Rounds** (`/admin/rounds`)

2. **Create Rounds:**
   - Add round name (e.g., "Quarterfinals", "Pitch Round")
   - Set duration in minutes
   - Configure judging window (optional time limit)

3. **Round Controls:**
   - **Start Round:** Opens judging for that round
   - **End Round:** Closes judging
   - **Advance Round:** Move to next round automatically

4. **Elimination Rounds:**
   - Set cutoff (e.g., top 50% advance)
   - Participants below threshold are marked eliminated

## Managing Judges

### Inviting Judges

1. **Generate Judge Access Codes**
   - Navigate to judge management
   - Create unique access codes per judge
   - Set expiration dates (optional)
   - Assign roles (judge vs admin)

2. **Share Codes:**
   - Email judge access link with code
   - Judge visits `/judge/access`
   - Judge enters code to verify access

### Monitoring Judge Activity

- Check conflict badges on participants (⚠️)
- High variance in scores indicates disagreement
- Review judge comments (if feature enabled)

## Display Options

### Stage Display for Presentations

1. **Navigate to Stage Mode** (`/stage`)
2. **Press F11** for fullscreen
3. **Connect to projector/TV**

**Features:**
- Large typography (easy to read from distance)
- Top 10 participants
- Real-time rank updates with animations
- Rank movement indicators (↑↓)
- Top 3 highlighted with gold/silver/bronze

**Best for:**
- Award ceremonies
- Live competitions
- Audience displays
- Conference presentations

### Podium/Winners View

1. **Enable in Feature Settings**
   - `/admin/settings`
   - Toggle "Podium/Winners View"
   - Select top N (3, 5, 8, or 10)

2. **During Event:**
   - Judges/audience see "🏆 Show Podium" button
   - Click to switch to podium view
   - Shows top N with animated cards
   - Gold/silver/bronze styling

**Best for:**
- Final results reveal
- Award ceremony moments
- Screenshot-friendly format

### Embedding Leaderboard on Website

1. **Navigate to Embed** (`/embed`)

2. **Copy Embed Code:**
   - Click "Copy Code" button
   - Paste into your website HTML

3. **Customize:**
   - Modify `width` and `height` attributes
   - Standard: `width="100%" height="600"`
   - Compact: `width="100%" height="400"`
   - Full: `width="100%" height="800"`

4. **Placement Ideas:**
   - Event homepage
   - Results page
   - Live stream overlay
   - Digital signage

## Real-Time Updates

### Understanding SSE (Server-Sent Events)

- **Live Badge:** Green "Live via SSE" badge indicates active connection
- **Automatic Updates:** No refresh needed
- **Event Types:**
  - Score changes
  - Rank movements
  - Round transitions
  - New participants

### Monitoring Connection

- Check for "Live via SSE" badge
- If disconnected: Refresh page
- Updates appear within 1-2 seconds

## Advanced Features

### Momentum Indicators

**When enabled:**
- 🔥 emoji appears for participants with 2+ consecutive rank improvements
- Shows "hot streaks"
- Adds excitement during competition

**Use cases:**
- Competitive events
- Gamified competitions
- Audience engagement

### Judge Comments

**When enabled:**
- Judges leave feedback per criterion
- General comments for overall assessment
- Visible to organizers (configure visibility)

**Accessing Comments:**
- View in admin panel (future feature)
- Export with score data
- Share with participants post-event

### Score Breakdown

**Configuration options:**
- **None:** Only show total scores
- **Total Only:** Show aggregated total
- **Per-Criterion:** Show breakdown by rubric criteria
- **Per-Judge:** Show individual judge scores

**Use cases:**
- Transparency: Show per-criterion to participants
- Calibration: Show per-judge to identify outliers
- Privacy: Use "Total Only" for sensitive competitions

## Common Workflows

### Workflow 1: One-Day Hackathon

**Pre-Event:**
1. Configure features (Podium, Momentum, Comments, Stage)
2. Create rubric (Innovation, Impact, Technical)
3. Generate judge access codes
4. Test with demo data

**Registration (Morning):**
1. Display Team QR at entrance
2. Participants scan and register
3. Monitor admin panel for registrations

**Hacking Phase (Midday):**
1. Display leaderboard on TV (use `/stage`)
2. Judges can see work-in-progress (optional)

**Judging Phase (Afternoon):**
1. Close registration
2. Start judging round
3. Judges visit `/judge` and score
4. Monitor for conflicts (⚠️ badges)

**Finals (Evening):**
1. Display podium view on stage
2. Reveal winners one-by-one
3. Share embedded leaderboard on website

**Post-Event:**
1. Export scores (future feature)
2. Share results via embed
3. Review judge comments

### Workflow 2: Multi-Day Conference

**Day 1:**
1. Setup: Configure features, rubric, judges
2. Round 1: Morning pitches
3. Display stage view during presentations
4. Judges score after each pitch

**Day 2:**
1. Round 2: Afternoon demos
2. Different criteria for demos
3. Running leaderboard shown between sessions

**Day 3:**
1. Finals: Top 10 advance
2. Final judging round
3. Podium reveal at closing ceremony
4. Embed final results on website

### Workflow 3: Classroom Competition

**Setup:**
1. Create rubric (Creativity, Effort, Presentation)
2. Set judging mode to Blinded
3. Enable score breakdown (per-criterion)

**During Class:**
1. Students present projects
2. Multiple judges score independently
3. Blinded mode prevents bias

**Results:**
1. Show podium (Top 3)
2. Share per-criterion breakdown with students
3. Judges' comments help with learning

## Troubleshooting

### Participants Can't Register
- Check if registration token is valid
- Verify QR code is displayed correctly
- Try manual registration via `/register`

### Scores Not Updating
- Refresh browser
- Check SSE connection (look for "Live" badge)
- Verify judges are submitting scores

### Features Not Showing
- Go to `/admin/settings`
- Verify feature is enabled
- Click "Save Settings"
- Clear browser cache

### Judge Access Issues
- Verify judge code is correct
- Check code hasn't expired
- Generate new code if needed

---

# 👨‍⚖️ Judge Guide

## Getting Started

### Accessing Judge Console

1. **Receive Access Code** from organizer
2. **Navigate to** `/judge/access`
3. **Enter your code**
4. **Redirected to** `/judge` console

### Understanding Judge Console

**Main Components:**
- **Participant Selector:** Dropdown to choose who to score
- **Rubric Criteria:** Input fields for each criterion
- **Score Inputs:** Number fields, sliders, or radio buttons
- **Submit Button:** Save scores to database

## Scoring Workflow

### Basic Scoring

1. **Select Participant** from dropdown
2. **Enter Scores** for each criterion
   - Follow rubric descriptions
   - Respect min/max values
   - Required fields marked with *

3. **Review Entries** before submitting
4. **Click "Submit Scores"**
5. **Confirmation:** "Saved" badge appears
6. **Next Participant:** Select another from dropdown

### Understanding Judging Modes

#### Aggregate Visible Mode (📊)
- You **CAN** see current totals
- Right panel shows participant scores
- Use for: Calibration, collaborative judging

#### Blinded Mode (🔒)
- You **CANNOT** see other scores
- Right panel hidden
- Use for: Independent assessment, reducing bias

### Using Comments Feature

**When enabled:**

1. **Per-Criterion Feedback:**
   - Textarea appears below each score field
   - Optional but recommended
   - Example: "Strong innovation but needs refinement"

2. **General Feedback:**
   - Large textarea at bottom
   - Overall assessment
   - Example: "Excellent presentation, impressive demo"

3. **Benefits:**
   - Helps organizers understand scores
   - Provides participant feedback
   - Documents decision rationale

### Score Entry Types

#### Number Input
- Type any value 0-100 (or custom max)
- Decimal values allowed
- Auto-clamps to min/max

#### Range Slider
- Drag slider to select value
- Visual feedback
- Good for quick scoring

#### Radio Buttons
- Fixed point values (0, 25, 50, 75, 100)
- Forces discrete choices
- Simplifies scoring

## Best Practices

### Before Judging

1. **Review Rubric:** Understand each criterion
2. **Calibrate:** Discuss scoring approach with other judges
3. **Test:** Try scoring one participant to familiarize

### During Judging

1. **Be Consistent:** Apply same standards to all
2. **Take Notes:** Use comment fields
3. **Use Full Scale:** Don't cluster scores in middle
4. **Required Fields:** Complete all required criteria
5. **Review Before Submit:** Double-check entries

### Handling Edge Cases

**Participant Not Listed?**
- Refresh page
- Contact organizer
- They may not be registered yet

**Made a Mistake?**
- Scores are idempotent (can resubmit)
- Select same participant
- Enter corrected scores
- Submit again (overwrites previous)

**Technical Issue?**
- Check internet connection
- Refresh browser
- Contact organizer
- Score on paper as backup

### Time-Limited Rounds

**When active:**
- Timer badge shows remaining time
- Format: MM:SS
- Turns red when < 1 minute left
- Submit button disabled when time expires

**Strategy:**
- Note time limit before starting
- Prioritize required criteria
- Leave optional fields if pressed for time
- Submit before deadline

## Advanced Features

### Score History

**When enabled:**
- System tracks all your score changes
- Timestamp recorded for each edit
- Useful for audit trail

### Bulk Scoring

**When enabled (future feature):**
- Score multiple participants in one view
- Streamlined interface
- Faster workflow for many participants

## Judge Ethics

### Do's
✅ Score independently (unless collaborative mode)
✅ Use full scale (0-100)
✅ Provide constructive feedback
✅ Follow rubric criteria
✅ Ask questions if unclear

### Don'ts
❌ Discuss scores during blinded judging
❌ Let personal bias affect scoring
❌ Score participants you know personally (disclose conflict)
❌ Rush through assessments
❌ Copy other judges' scores

---

# 👤 Participant Guide

## Registration

### Scanning QR Code

1. **Find Registration QR** at event entrance or kiosk
2. **Scan with Phone Camera**
   - iOS: Camera app
   - Android: Camera or QR scanner app
3. **Opens Registration Form** in browser
4. **Enter Your Information:**
   - Team/Individual name
   - Contact info (if required)
   - Additional profile data

5. **Submit Registration**
6. **Confirmation:** You're now in the system

### Manual Registration

1. **Navigate to** `/register?token=XXX&kind=team`
2. **Fill Form**
3. **Submit**

### Kiosk Mode

1. **Find Event Kiosk** (tablet/computer at venue)
2. **Auto-generates QR codes**
3. **Scan displayed QR**
4. **Complete registration**

## Viewing Your Progress

### Leaderboard

**Access:** `/leaderboard`

**What You See:**
- Your rank among all participants
- Your current score
- Other participants (unless hidden by organizer)
- Real-time updates as judges score

**Features:**
- **Rank Column:** Your position (#1, #2, etc.)
- **Score Column:** Your total points
- **Type Badge:** Team or Individual indicator
- **Movement Arrows:** ↑ (moved up) or ↓ (moved down)
- **Momentum 🔥:** If enabled, shows hot streaks

### Understanding Score Updates

**Real-Time:**
- Scores update within seconds of judge submission
- No refresh needed (SSE connection)
- Watch for rank changes live

**Rank Movements:**
- Green ↑ arrow: You moved up
- Red ↓ arrow: You moved down
- Animated highlight when you move

**Momentum Indicator (if enabled):**
- 🔥 emoji appears when you improve 2+ times in a row
- Shows you're "on fire"
- Adds competitive excitement

### Podium View

**When organizer enables:**
- Button appears: "🏆 Show Podium"
- Click to see top N winners
- Animated cards with styling:
  - 🥇 Gold - 1st place
  - 🥈 Silver - 2nd place
  - 🥉 Bronze - 3rd place
  - 💙 Blue - Other top finishers

## During Competition

### What to Expect

**Judging Phase:**
- Your score starts at 0
- Increases as judges score your work
- Rank updates in real-time
- May see your position change frequently

**Round Changes:**
- Round name displayed at top
- Timer shows time remaining
- Different criteria per round (if configured)

**Elimination Rounds:**
- Cutoff line shown (if configured)
- You know if you advance
- Status updates immediately

### Strategy Tips

**Monitor Leaderboard:**
- Check periodically during event
- Don't obsess - focus on your work!
- Use momentum as motivation

**Understand Rubric:**
- Ask organizers for scoring criteria
- Align your work to rubric
- All criteria may not be equally weighted

**Stay Engaged:**
- React to close races
- Cheer for others (good sportsmanship)
- Enjoy the competition!

## After Event

### Final Results

**Podium Reveal:**
- Organizer likely switches to podium view
- Your final rank displayed
- Celebrate if you placed!

**Embedded Results:**
- Check event website
- Leaderboard often embedded there
- Permanent record of results

### Feedback (if enabled)

**Judge Comments:**
- Organizers may share feedback
- Per-criterion insights
- Learn from comments
- Apply to future competitions

**Score Breakdown:**
- May see detailed scoring
- Per-criterion scores
- Per-judge scores (if transparent)
- Understand strengths/weaknesses

---

# 👀 Audience/Viewer Guide

## Watching Live

### Accessing Leaderboard

**Public URL:** `/leaderboard`
- No login required (if event is public)
- Real-time updates
- See all participants and scores

**Embedded View:**
- Visit event website
- Leaderboard embedded in page
- Same live updates
- Seamless integration

**Stage Display:** `/stage`
- Large-format view
- Optimized for viewing from distance
- Great for watching on big screens
- Top 10 display

## Understanding the Display

### Leaderboard Elements

**Participant Names:** Team or individual names
**Ranks:** Current position (#1, #2, etc.)
**Scores:** Total points
**Type Badges:** Team vs Individual
**Live Badge:** Green badge = real-time updates active

### Dynamic Updates

**Score Changes:**
- Numbers update automatically
- No refresh needed
- Happens within 1-2 seconds

**Rank Movements:**
- ↑ Green arrow: Moved up
- ↓ Red arrow: Moved down
- Animated transitions
- Highlights on change

**Momentum Indicators (if enabled):**
- 🔥 Fire emoji for hot streaks
- Shows which teams are surging
- Adds drama to competition

### Round Information

**Round Display (if configured):**
- Round name (e.g., "Finals")
- Round timer (MM:SS countdown)
- Progress bar
- Turns red when time running out

## Interactive Features

### Live Reactions (if enabled)

**When available:**
- Emoji picker or reaction buttons
- Send reactions to participants
- Reactions appear on leaderboard
- Engage with competition

**Common Reactions:**
- 🔥 Fire - Hot performance
- 👏 Clap - Applause
- 🎉 Party - Celebration
- 💡 Bulb - Great idea
- ⭐ Star - Outstanding

### Public Voting (if enabled)

**How it Works:**
- Vote for your favorite
- Vote weight configured by organizer
- Combines with judge scores
- See impact on leaderboard

**Casting Your Vote:**
1. Find voting UI on leaderboard
2. Select your favorite participant
3. Submit vote
4. May vote multiple times (if allowed)
5. See live results

## Viewing Options

### Standard Leaderboard (`/leaderboard`)
**Best for:**
- Desktop viewing
- Detailed information
- Following specific participants
- Mobile viewing

### Stage Display (`/stage`)
**Best for:**
- Projector/TV viewing
- Award ceremonies
- Large audiences
- Event presentations
- Live streaming overlays

### Embedded View (on event website)
**Best for:**
- Integrated experience
- Event homepage
- Persistent display
- Archival results

### Podium View (when shown)
**Best for:**
- Final results reveal
- Winner celebrations
- Screenshot-friendly
- Dramatic moments

## Enhancing Your Experience

### Multiple Screens

**Setup:**
- Screen 1: Stage display on projector
- Screen 2: Regular leaderboard on laptop
- Screen 3: Event website with embed

### Second Screen Tips

- Follow detailed scores while watching stage
- Check score breakdowns if available
- Read participant profiles if enabled
- Engage via reactions/voting

### Mobile Viewing

- Fully responsive design
- All features work on phone
- Great for personal viewing
- Can vote/react from mobile

### Screenshot/Recording

**Stage Display:**
- Press F11 for fullscreen
- Clean, professional look
- Great for screenshots
- Perfect for social media

**Podium View:**
- Winner cards look impressive
- Easy to screenshot
- Share on social media
- Permanent record

---

# 🏢 Organization Administrator Guide

## Multi-Event Management

### Organization Setup

1. **Create Organization** (in database)
   - Organization name
   - Unique slug
   - Branding theme (optional)

2. **Brand Customization** (if enabled)
   - Logo upload
   - Color scheme
   - Font choices
   - Custom CSS

### Managing Multiple Events

**Event Structure:**
```
Organization
├── Event 1 (Conference 2025)
│   ├── Features: Podium, Stage, Embed
│   ├── Participants: 50 teams
│   └── Judges: 10
├── Event 2 (Hackathon Spring)
│   ├── Features: Momentum, Voting, Reactions
│   ├── Participants: 100 individuals
│   └── Judges: 5
└── Event 3 (Annual Competition)
    ├── Features: Comments, Score Breakdown
    ├── Participants: 30 teams
    └── Judges: 15
```

**Per-Event Configuration:**
- Each event has independent feature settings
- Separate participant pools
- Different judging configurations
- Unique rubrics and rounds

## Advanced Administration

### User Access Control

**Role Hierarchy:**
1. **Org Admin:** Full organization access
2. **Event Admin:** Single event access
3. **Judge:** Judging access only
4. **Participant:** View-only + registration

**Assigning Roles:**
- Generate access codes per role
- Set expiration dates
- Revoke access when needed
- Audit access logs

### Analytics & Reporting (Future)

**Metrics to Track:**
- Participant engagement
- Judge activity
- Score distribution
- Conflict rates
- Feature usage
- Audience reactions

**Reports:**
- Export to CSV/Excel
- PDF certificates
- Participant performance history
- Judge calibration analysis

### Data Management

**Backup Strategy:**
- Regular database backups
- Export event data
- Archive old events
- Maintain audit trails

**Data Privacy:**
- Configure score visibility
- Control judge comment access
- Manage participant data
- GDPR compliance (if applicable)

## Scaling Considerations

### Large Events (100+ Participants)

**Performance:**
- SSE handles 1000+ concurrent connections
- Database indexed for fast queries
- Pagination recommended (future feature)

**Judging:**
- Assign judges to groups
- Stagger judging rounds
- Use bulk scoring (future feature)

**Display:**
- Show top 50 on leaderboard
- Use stage display for top 10
- Filter by category/group

### Multi-Day Events

**Day 1:**
- Initial rounds and judging
- Broad participation

**Day 2:**
- Intermediate rounds
- Elimination starts

**Day 3:**
- Final rounds
- Top N advance

**Configuration:**
- Use rounds feature
- Set elimination cutoffs
- Different rubrics per day

## Integration Options

### Embedding in Custom Sites

**Standard Embed:**
```html
<iframe 
  src="https://your-domain.com/leaderboard"
  width="100%" 
  height="600"
  frameborder="0">
</iframe>
```

**Custom Styling:**
- White-label options (future)
- Custom CSS injection
- Brand colors

### API Integration (Future)

**Endpoints:**
- GET /api/events - List events
- GET /api/events/:id/participants - Get participants
- GET /api/events/:id/scores - Export scores
- POST /api/events/:id/webhook - Webhook for integrations

**Use Cases:**
- Sync with registration platform
- Send notifications
- Trigger actions on score changes
- External analytics

### Webhooks (Future)

**Event Triggers:**
- New participant registered
- Score submitted
- Round changed
- Winner determined

**Actions:**
- Send emails
- Post to Slack/Discord
- Update external systems
- Trigger automations

---

# 📚 Quick Reference by Use Case

## Use Case 1: University Class Project Showcase

**Roles:** Professor (Admin), TAs (Judges), Students (Participants), Parents (Audience)

**Setup:**
1. Professor enables: Podium (Top 3), Judge Comments, Score Breakdown
2. Creates rubric: Creativity, Technical, Presentation
3. Sets blinded judging mode
4. Generates QR codes for student registration

**Execution:**
1. Students scan QR and register projects
2. TAs score during presentations
3. Leaderboard shown on classroom screen
4. Podium reveal at end of class

**Post-Event:**
1. Share per-criterion scores with students
2. Students read TA comments for learning
3. Embed results on class website

## Use Case 2: Corporate Innovation Challenge

**Roles:** HR/Organizer (Admin), Executives (Judges), Employees (Participants), Company (Audience)

**Setup:**
1. Organizer enables: Stage Display, Embed, Momentum
2. Creates professional rubric: Business Impact, Innovation, Feasibility
3. Sets aggregate visible mode (collaborative)
4. Configures 3 rounds: Pitch, Prototype, Final

**Execution:**
1. Teams register at start of challenge
2. Round 1: Pitch scoring
3. Round 2: Prototype demos (different criteria)
4. Round 3: Finals (top 10 advance)
5. Stage display during company all-hands

**Post-Event:**
1. Embedded leaderboard on intranet
2. Winners featured in newsletter
3. Historical data for next year

## Use Case 3: Community Hackathon

**Roles:** Organizers (Admin), Industry Experts (Judges), Developers (Participants), Sponsors (Audience)

**Setup:**
1. Organizers enable: Momentum, Podium (Top 10), Public Voting, Embed
2. Creates rubric: Innovation, Impact, Technical, Design
3. Public voting weighted at 20%
4. 24-hour duration

**Execution:**
1. Registration at venue entrance (QR codes)
2. Stage display shown throughout event
3. Live updates create excitement
4. 🔥 momentum indicators engage audience
5. Public can vote for favorites
6. Podium reveal at closing

**Post-Event:**
1. Embedded on hackathon website
2. Social media shares of podium
3. Judge comments shared with teams
4. Historical comparison for next year

## Use Case 4: Science Fair

**Roles:** Teachers (Admin), Scientists (Judges), Students (Participants), Families (Audience)

**Setup:**
1. Teachers enable: Podium (Top 5), Comments, Score Breakdown (Per-Criterion)
2. Rubric: Scientific Method, Creativity, Presentation, Impact
3. Blinded judging for fairness
4. Age categories configured

**Execution:**
1. Students register projects
2. Judges score independently
3. Families watch leaderboard on displays
4. Podium view during awards ceremony
5. Top 5 in each category highlighted

**Post-Event:**
1. Per-criterion feedback for all students
2. Embedded results on school website
3. Certificates generated
4. Data archived for future reference

---

# 🆘 Troubleshooting by Role

## For Organizers

| Problem | Solution |
|---------|----------|
| Features not saving | Check browser console, verify DB connection |
| Participants can't register | Generate new QR code, check token validity |
| Judges can't access | Regenerate access codes, verify not expired |
| Scores not updating | Check SSE connection, restart server |
| Leaderboard frozen | Refresh browser, check "Live" badge |
| Wrong scores shown | Verify rubric weights, check calculation |

## For Judges

| Problem | Solution |
|---------|----------|
| Can't submit scores | Check required fields, verify internet |
| Wrong participant selected | Select different from dropdown |
| Made scoring mistake | Reselect participant, resubmit (overwrites) |
| Can't see participants | Refresh page, check registration |
| Time expired | Contact organizer to extend window |
| Access denied | Verify code, contact organizer |

## For Participants

| Problem | Solution |
|---------|----------|
| Can't register | Check QR code, try manual URL |
| Not on leaderboard | Verify registration completed |
| Wrong name shown | Contact organizer to update |
| Score not updating | Judges may not have scored yet |
| Can't see rank | Check if visibility is restricted |
| Want score details | Ask organizer if breakdown enabled |

## For Audience

| Problem | Solution |
|---------|----------|
| Leaderboard not loading | Check internet, try different browser |
| Updates stopped | Refresh page, look for "Live" badge |
| Can't vote | Feature may not be enabled |
| Can't react | Check if reactions are enabled |
| Embed not working | Contact website administrator |
| Mobile view broken | Rotate phone, update browser |

---

# 📞 Support & Resources

## Documentation Files

- **FEATURES.md** - Complete feature reference
- **TESTING_GUIDE.md** - Testing instructions
- **ARCHITECTURE.md** - System design
- **QUICK_REFERENCE.md** - Cheat sheet
- **This file** - User guide for all roles

## Getting Help

1. **Check documentation** in the files above
2. **Review troubleshooting** section for your role
3. **Contact organizer** if you're a participant/judge
4. **Check browser console** for technical errors
5. **Try incognito mode** to rule out cache issues

## Best Practices Summary

### For Success

✅ **Test before event** - Run through full workflow
✅ **Communicate clearly** - Share links and instructions
✅ **Monitor actively** - Watch for issues during event
✅ **Have backup plan** - Paper scoring if tech fails
✅ **Document settings** - Save feature configuration

### For Great Experience

✅ **Enable right features** - Match to event type
✅ **Use stage display** - Professional presentation
✅ **Leverage real-time** - Create excitement
✅ **Provide feedback** - Enable judge comments
✅ **Share results** - Embed on website

---

**Live Leaderboard - Making competitions engaging, transparent, and fun! 🏆**
