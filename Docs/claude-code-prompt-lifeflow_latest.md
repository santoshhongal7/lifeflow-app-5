# Claude Code Prompt — LifeFlow PWA Activity & Goal Tracker
# Version 3.0 — Multi-User + Firebase Auth + Firestore + Vercel

---

## Project Overview

Build a production-grade **Progressive Web App (PWA)** called **LifeFlow** — a
comprehensive personal activity and goal tracker for active individuals managing
multiple goals across fitness, wellness, sports, diet, and personal development.

The **core design philosophy** is a **hierarchical goal system**:
every Main Goal is a container that holds multiple Sub-Goals (mini habits/tasks).
Each day the user arrives at a dedicated daily check-in screen and marks each
sub-goal as Done or Missed. This is the heartbeat of the entire app.

This is a **multi-user application** (up to 1000 users). Each user has isolated
data. Authentication is **email/password via Firebase Auth**. All data is stored
in **Firebase Firestore (free Spark plan)**. Hosted on **Vercel**.

---

## Infrastructure Stack

| Layer    | Service                          | Plan         | Cost |
|----------|----------------------------------|--------------|------|
| Hosting  | Vercel                           | Hobby (free) | $0   |
| Auth     | Firebase Authentication          | Spark (free) | $0   |
| Database | Firebase Firestore               | Spark (free) | $0   |
| CI/CD    | Vercel GitHub auto-deploy        | Auto          | $0   |

---

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite with vite-plugin-pwa
- **Styling**: Tailwind CSS v3 + custom CSS variables
- **State Management**: Zustand (in-memory; Firestore is source of truth)
- **Backend/DB**: Firebase Firestore
- **Auth**: Firebase Authentication (email/password)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Date Handling**: date-fns
- **PWA**: Workbox via vite-plugin-pwa
- **Animations**: Framer Motion
- **Confetti**: canvas-confetti
- **DnD**: @dnd-kit/sortable (sub-goal reorder)

---

## STEP 0: Firebase Project Setup (Do This Before Coding)

### A — Create Firebase Project
```
1. Go to https://console.firebase.google.com
2. Click "Add project" → Name: lifeflow-app
3. Disable Google Analytics → Click "Create project"
```

### B — Enable Authentication
```
1. Firebase Console → Build → Authentication → Get started
2. Sign-in method tab → Enable "Email/Password" → Save
```

### C — Create Firestore Database
```
1. Firebase Console → Build → Firestore Database → Create database
2. Choose "Start in production mode"
3. Region: asia-south1 (Mumbai — best for India)
4. Click Done
```

### D — Set Firestore Security Rules
In Firestore → Rules tab, paste exactly:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /goals/{goalId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
    }

    match /checkIns/{checkInId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
    }

    match /activities/{activityId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
    }

    match /activityLogs/{logId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### E — Get Firebase Config Keys
```
1. Firebase Console → Project Settings (gear icon top-left)
2. Scroll to "Your apps" → Click "</>" Web
3. Register app name: lifeflow-web
4. Copy the firebaseConfig object shown
```

### F — Create Firestore Composite Indexes
Firebase Console → Firestore → Indexes → Add index:
```
Collection: goals
  Fields: userId ASC, createdAt DESC

Collection: checkIns
  Fields: userId ASC, goalId ASC, date DESC

Collection: checkIns
  Fields: userId ASC, date DESC

Collection: activities
  Fields: userId ASC, createdAt DESC

Collection: activityLogs
  Fields: userId ASC, activityId ASC, date DESC
```

### G — Environment Files
Create .env in project root (NEVER commit this):
```
VITE_FIREBASE_API_KEY=paste_your_key
VITE_FIREBASE_AUTH_DOMAIN=lifeflow-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lifeflow-app
VITE_FIREBASE_STORAGE_BUCKET=lifeflow-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=paste_your_id
VITE_FIREBASE_APP_ID=paste_your_app_id
```

Create .env.example (safe to commit — blank template):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Add .env to .gitignore immediately.

---

## STEP 1: Vercel Deployment Setup

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial LifeFlow setup"
# Create repo on github.com named: lifeflow-app
git remote add origin https://github.com/YOUR_USERNAME/lifeflow-app.git
git push -u origin main
```

### Connect to Vercel
```
1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New Project" → Import lifeflow-app repo
3. Framework preset: Vite (auto-detected)
4. Build command: npm run build
5. Output directory: dist
6. Click "Environment Variables" section
7. Add all 6 VITE_FIREBASE_* variables (copy from your .env)
8. Click Deploy
9. App goes live at: https://lifeflow-app.vercel.app
```

### Add Vercel Domain to Firebase
```
Firebase Console → Authentication → Settings → Authorized domains
→ Add: lifeflow-app.vercel.app → Save
```

### Auto-Deploy
Every git push to main = Vercel redeploys automatically in ~30 seconds.

---

## Firestore Database Structure

Every document carries the owner userId for strict multi-user isolation.
Max 50KB per user total.

```
firestore/
|
|-- users/
|   |-- {userId}/                    Document ID = Firebase Auth UID
|       |-- uid: string
|       |-- email: string
|       |-- displayName: string
|       |-- avatar: string           emoji e.g. "🧑"
|       |-- createdAt: Timestamp
|       |-- lastLoginAt: Timestamp
|       |-- settings: {
|               theme: dark|light|system
|               accentColor: string
|               reminderTime: HH:MM
|               weekStartsOn: 0|1
|               notificationsEnabled: boolean
|               autoMissAfterMidnight: boolean
|               schemaVersion: 1
|           }
|
|-- goals/
|   |-- {goalId}/                    Auto-generated ID
|       |-- userId: string           OWNER FILTER KEY
|       |-- title: string
|       |-- description: string
|       |-- emoji: string
|       |-- color: string
|       |-- category: string
|       |-- totalDays: number
|       |-- startDate: YYYY-MM-DD
|       |-- endDate: YYYY-MM-DD
|       |-- status: active|completed|failed|paused
|       |-- completionRule: string
|       |-- completionThreshold: number
|       |-- coverGradient: string
|       |-- subGoals: SubGoal[]      Embedded array — not subcollection
|       |-- createdAt: Timestamp
|       |-- updatedAt: Timestamp
|
|-- checkIns/
|   |-- {checkInId}/                 ID format: {userId}_{goalId}_{YYYY-MM-DD}
|       |-- userId: string           OWNER FILTER KEY
|       |-- goalId: string
|       |-- date: YYYY-MM-DD
|       |-- subGoalEntries: SubGoalEntry[]
|       |-- isGoalDayComplete: boolean
|       |-- completionPercentage: number
|       |-- wasAutoMissed: boolean
|       |-- notes: string
|       |-- submittedAt: Timestamp
|
|-- activities/
|   |-- {activityId}/
|       |-- userId: string           OWNER FILTER KEY
|       |-- name: string
|       |-- category: string
|       |-- icon, color, unit, defaultTarget
|       |-- createdAt: Timestamp
|
|-- activityLogs/
    |-- {logId}/
        |-- userId: string           OWNER FILTER KEY
        |-- activityId: string
        |-- date: YYYY-MM-DD
        |-- value, unit, notes
        |-- loggedAt: Timestamp
```

### Query Pattern — Always Filter by userId
```typescript
// CORRECT
const q = query(
  collection(db, 'goals'),
  where('userId', '==', currentUser.uid),
  orderBy('createdAt', 'desc')
);

// NEVER query without userId filter
```

---

## Architecture & Folder Structure

```
src/
|-- app/
|   |-- App.tsx                     Root: Auth listener + Router
|   |-- routes.tsx                  Public routes + Protected routes
|   |-- store/
|       |-- authStore.ts            Firebase Auth state
|       |-- goalStore.ts            Goals (Firestore-backed)
|       |-- checkInStore.ts         Daily check-ins (Firestore-backed)
|       |-- activityStore.ts
|       |-- settingsStore.ts
|
|-- features/
|   |-- auth/
|   |   |-- LoginPage.tsx           Email/password login UI
|   |   |-- RegisterPage.tsx        New user registration UI
|   |   |-- AuthLayout.tsx          Shared auth page wrapper
|   |   |-- useAuth.ts
|   |-- dashboard/
|   |   |-- Dashboard.tsx
|   |   |-- GoalProgressCard.tsx    HD transparent goal card
|   |   |-- SubGoalProgressBar.tsx
|   |   |-- TodayCheckinBanner.tsx
|   |-- goals/
|   |   |-- GoalsList.tsx
|   |   |-- GoalDetail.tsx
|   |   |-- CreateGoalWizard.tsx
|   |   |-- SubGoalEditor.tsx
|   |   |-- GoalCalendar.tsx
|   |-- checkin/
|   |   |-- DailyCheckIn.tsx
|   |   |-- CheckInCard.tsx
|   |   |-- CheckInSummary.tsx
|   |-- streaks/
|   |-- activities/
|   |-- diet/
|   |-- analytics/
|   |-- settings/
|
|-- lib/
|   |-- firebase.ts                 Firebase app init + exports
|   |-- firestore/
|   |   |-- goalsService.ts
|   |   |-- checkInsService.ts
|   |   |-- activitiesService.ts
|   |   |-- userService.ts
|   |-- auth/
|       |-- authService.ts
|
|-- shared/
|   |-- components/
|   |   |-- AuthGuard.tsx           Redirect to /login if not authed
|   |   |-- GlassCard.tsx
|   |   |-- CircularProgress.tsx
|   |   |-- BottomSheet.tsx
|   |   |-- ActivityHeatmap.tsx
|   |   |-- MilestoneOverlay.tsx
|   |   |-- CountdownTimer.tsx
|   |-- hooks/
|   |-- utils/
|   |   |-- dateUtils.ts
|   |   |-- streakUtils.ts
|   |   |-- goalUtils.ts
|   |-- types/
|       |-- index.ts
|
|-- styles/
    |-- globals.css
```

---

## Firebase Initialization

### src/lib/firebase.ts
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
```

---

## Authentication System

### LoginPage.tsx (/login)

```
Full-screen dark page with animated gradient mesh background.
Centered glass card (max-width 420px):

  [Wave emoji] LifeFlow
  Track goals. Build streaks.

  Welcome back

  Email
  [________________________]

  Password
  [________________________] [eye icon]

  [        Sign In        ]    <- full-width gradient button

  Don't have an account?
  [Create one]
```

- Email: type="email", autocomplete="email"
- Password: type="password" with show/hide Eye icon toggle
- Button: full-width, gradient, Framer Motion press scale, spinner when loading
- Error messages shown inline below field:
  - auth/user-not-found → "No account found with this email"
  - auth/wrong-password → "Incorrect password"
  - auth/too-many-requests → "Too many attempts. Try again later."
- On success: redirect to / (dashboard)
- Already logged in: redirect to / immediately (check in useEffect)

### RegisterPage.tsx (/register)

```
Same glass card layout:

  Create your account

  Your name
  [________________________]

  Email
  [________________________]

  Password
  [________________________] [eye]
  Must be at least 8 characters

  Confirm Password
  [________________________] [eye]

  [     Create Account     ]

  Already have an account? [Sign in]
```

- Validate on submit: name not empty, valid email, password >= 8 chars, passwords match
- Show inline validation errors onBlur
- On submit:
  1. createUserWithEmailAndPassword(auth, email, password)
  2. updateProfile(user, { displayName: name })
  3. Create Firestore users/{uid} document with default settings
  4. Redirect to / (dashboard)
- Error: auth/email-already-in-use → "An account with this email already exists"

### AuthGuard.tsx

```typescript
const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuthStore();
  if (loading) return <SplashScreen />;    // Logo + spinner while auth resolves
  if (!user)   return <Navigate to="/login" replace />;
  return <>{children}</>;
};
```

### Route Structure (routes.tsx)

```typescript
// Public — no auth required
/login           LoginPage
/register        RegisterPage

// Protected — wrapped in AuthGuard
/                Dashboard
/checkin         DailyCheckIn
/checkin/:goalId DailyCheckIn (specific goal)
/goals           GoalsList
/goals/create    CreateGoalWizard
/goals/:id       GoalDetail
/goals/:id/edit  GoalDetail (edit mode)
/activities      ActivitiesPage
/streaks         StreaksPage
/analytics       AnalyticsPage
/diet            DietPage
/settings        SettingsPage
```

### authStore.ts

```typescript
interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}
```

### App.tsx — Wire Auth Listener

```typescript
// In App.tsx useEffect:
onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, loading: false });
  if (user) {
    // Start Firestore real-time listeners for this user
    useGoalStore.getState().startListening(user.uid);
    useCheckInStore.getState().startListening(user.uid);
    useActivityStore.getState().startListening(user.uid);
  } else {
    // Clear all data on logout
    useGoalStore.getState().stopListening();
    useCheckInStore.getState().stopListening();
    useActivityStore.getState().stopListening();
  }
});
```

### authService.ts

```typescript
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const registerUser = async (email: string, password: string, displayName: string) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    avatar: 'person',
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    settings: {
      theme: 'dark',
      accentColor: '#f093fb',
      reminderTime: '08:00',
      weekStartsOn: 1,
      notificationsEnabled: false,
      autoMissAfterMidnight: true,
      schemaVersion: 1,
    },
  });
  return user;
};

export const signInUser = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', user.uid), { lastLoginAt: serverTimestamp() }, { merge: true });
  return user;
};

export const signOutUser = () => firebaseSignOut(auth);
```

---

## Firestore Service Layer

All Firestore calls go through service files. Never call Firestore directly from components.

### goalsService.ts

```typescript
import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';

const COL = 'goals';

// Real-time listener — returns unsubscribe fn
export const subscribeToGoals = (userId: string, onData: (goals: MainGoal[]) => void) => {
  const q = query(collection(db, COL), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as MainGoal)));
  });
};

export const createGoal = (userId: string, goal: Omit<MainGoal, 'id'|'createdAt'|'updatedAt'>) =>
  addDoc(collection(db, COL), { ...goal, userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

export const updateGoal = (goalId: string, updates: Partial<MainGoal>) =>
  updateDoc(doc(db, COL, goalId), { ...updates, updatedAt: serverTimestamp() });

export const deleteGoal = (goalId: string) => deleteDoc(doc(db, COL, goalId));
```

### checkInsService.ts

```typescript
// Document ID is deterministic: {userId}_{goalId}_{date}
// This ensures exactly one check-in per user per goal per day

export const getCheckInId = (userId: string, goalId: string, date: string) =>
  `${userId}_${goalId}_${date}`;

export const submitCheckIn = (userId: string, checkIn: Omit<DailyCheckIn, 'id'>) => {
  const id = getCheckInId(userId, checkIn.goalId, checkIn.date);
  return setDoc(doc(db, 'checkIns', id), {
    ...checkIn, userId, submittedAt: serverTimestamp()
  });
};

export const subscribeToCheckIns = (userId: string, goalId: string, onData: (c: DailyCheckIn[]) => void) => {
  const q = query(
    collection(db, 'checkIns'),
    where('userId', '==', userId),
    where('goalId', '==', goalId),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyCheckIn)));
  });
};
```

---

## Updated Zustand Stores (Firestore-backed)

Zustand holds in-memory cache populated by Firestore real-time listeners.
No localStorage for app data (auth state only via Firebase SDK internally).

### goalStore.ts

```typescript
interface GoalStore {
  goals: MainGoal[];
  loading: boolean;
  unsubscribe: (() => void) | null;

  startListening: (userId: string) => void;  // Start Firestore listener
  stopListening: () => void;                 // Stop listener + clear data

  addGoal: (userId: string, goal: Omit<MainGoal, 'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<MainGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addSubGoal: (goalId: string, subGoal: Omit<SubGoal, 'id'>) => Promise<void>;
  updateSubGoal: (goalId: string, subGoalId: string, updates: Partial<SubGoal>) => Promise<void>;
  deleteSubGoal: (goalId: string, subGoalId: string) => Promise<void>;
  reorderSubGoals: (goalId: string, orderedIds: string[]) => Promise<void>;

  getActiveGoals: () => MainGoal[];
  getDaysRemaining: (goalId: string) => number;
  getCurrentDayNumber: (goalId: string) => number;
}
```

---

## Core Data Models (src/shared/types/index.ts)

```typescript
type ActivityCategory =
  | 'fitness' | 'wellness' | 'mindfulness' | 'sports'
  | 'diet' | 'learning' | 'sleep' | 'productivity' | 'custom';

type CheckInStatus = 'done' | 'missed' | 'pending' | 'skipped';
type GoalStatus = 'active' | 'completed' | 'failed' | 'paused' | 'upcoming';
type CalendarDayStatus = 'complete' | 'partial' | 'missed' | 'future' | 'today' | 'not_applicable';

interface SubGoal {
  id: string;
  parentGoalId: string;
  title: string;
  description?: string;
  category: ActivityCategory;
  icon: string;                  // Lucide icon name
  color: string;
  targetType: 'boolean' | 'quantity';
  targetValue?: number;
  targetUnit?: string;
  activeDays: number[];          // [0-6], Sun=0
  isRequired: boolean;
  sortOrder: number;
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface MainGoal {
  id: string;
  userId: string;                // Firebase Auth UID — ALWAYS present
  title: string;
  description: string;
  emoji: string;
  color: string;
  category: ActivityCategory;
  totalDays: number;
  startDate: string;             // YYYY-MM-DD
  endDate: string;               // YYYY-MM-DD
  subGoals: SubGoal[];
  completionRule: 'all_required' | 'any_required' | 'percentage';
  completionThreshold?: number;
  status: GoalStatus;
  coverGradient: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyCheckIn {
  id: string;
  userId: string;                // Firebase Auth UID
  goalId: string;
  date: string;                  // YYYY-MM-DD
  subGoalEntries: SubGoalEntry[];
  isGoalDayComplete: boolean;
  completionPercentage: number;
  wasAutoMissed: boolean;
  submittedAt?: string;
  notes?: string;
}

interface SubGoalEntry {
  subGoalId: string;
  status: CheckInStatus;
  value?: number;
  loggedAt?: string;
}

interface GoalStreak {
  goalId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompleteDate: string;
  totalCompleteDays: number;
  totalMissedDays: number;
  completionRate: number;
  milestones: number[];
}

interface SubGoalStreak {
  subGoalId: string;
  goalId: string;
  currentStreak: number;
  longestStreak: number;
  lastDoneDate: string;
  totalDone: number;
  totalMissed: number;
}

interface Activity {
  id: string;
  userId: string;
  name: string;
  category: ActivityCategory;
  icon: string;
  color: string;
  unit: string;
  defaultTarget: number;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  activityId: string;
  date: string;
  value: number;
  unit: string;
  notes?: string;
  loggedAt: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatar: string;
  createdAt: string;
  lastLoginAt: string;
  settings: UserSettings;
}

interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  reminderTime: string;
  weekStartsOn: 0 | 1;
  notificationsEnabled: boolean;
  autoMissAfterMidnight: boolean;
  schemaVersion: number;
}

interface CalendarDay {
  date: string;
  status: CalendarDayStatus;
  completionPercentage: number;
  dayNumber: number;
}
```

---

## THE CORE FEATURE: Hierarchical Goal System

### 5-Step Goal Creation Wizard (/goals/create)

Step 1 — Goal Identity: title, description, emoji picker, category, color theme
Step 2 — Duration: number of days + presets (7/21/30/50/75/100) + start date + auto end date
Step 3 — Sub-Goals: add 1-10 sub-goals with title, type (boolean/quantity), icon, color,
  required toggle, active days. Drag-to-reorder via @dnd-kit/sortable.
Step 4 — Completion Rules: all required / any required / X% threshold + auto-miss toggle
Step 5 — Review & Launch: summary → writes to Firestore goals/ → redirect to goal detail

### Editing After Creation (/goals/:id/edit)

- Edit title, description, emoji, color, completion rule
- Add/edit/delete/reorder sub-goals at any time
- Warning shown if deleting a sub-goal with history
- Past check-ins are NOT retroactively changed

---

## DAILY CHECK-IN SYSTEM

Route: /checkin or /checkin/:goalId

Each active goal shows a check-in screen:
- Header: goal title + "Day X of 100" + current streak badge
- Per sub-goal glass card:
  - Boolean type: large [Done] and [Missed] tap targets
    Done = card turns green-tinted, Missed = red-tinted
    Deselect by tapping again
  - Quantity type: number input + unit → then Done/Missed appear
    Auto-highlights Done if value >= target
  - Framer Motion spring bounce on Done tap
- Live count: "Submit (2 of 3 done)" sticky button at bottom
- On submit: write DailyCheckIn to Firestore, recalculate streaks,
  show confetti if day complete or milestone hit
- Multiple goals: horizontal tab strip to switch between them
- Edit today's check-in until midnight
- Past check-ins: read-only

---

## DASHBOARD — HD Transparent Tracking System

GoalProgressCard.tsx — full-width glass card per active goal:
```
[emoji] Goal Title                           [...options]
Day 12 of 100  |  Ends Dec 15 2026

[============================--------] 12%

[fire 12 streak]  [check 9 complete]  [x 3 missed]

-- Today's Sub-Goals -------------------------
[icon] Wake up at 6 AM     [====================] Done
[icon] Meditate 30 min     [===========--------] 20/30 min
[icon] Exercise 30 min     [--------------------] Pending

[View Details]                    [Check In ->]
```

Additional dashboard sections:
- Today's Check-In Banner (amber glow) if pending check-in exists
- Weekly Heatmap: 7-day colored dot grid per goal
- Streak Leaderboard Strip: top 3 streaks horizontal scroll
- Recent Activity Feed: last 5 check-in submissions

---

## SETTINGS PAGE — User Profile & Sign Out

- Edit display name (updates Firebase Auth + Firestore)
- Change avatar emoji
- Theme, reminder time, auto-miss toggle
- Sign Out button (prominent, bottom of page):
  signOutUser() + stopListening() + navigate to /login
- Delete Account (danger zone, type DELETE to confirm)

---

## UI DESIGN SYSTEM

### Dark Glassmorphism + Category Accents

```css
:root {
  --bg-primary: #080810;
  --bg-secondary: #0f0f1a;
  --bg-card: rgba(255,255,255,0.04);
  --bg-card-hover: rgba(255,255,255,0.07);
  --glass-border: rgba(255,255,255,0.09);
  --glass-border-hover: rgba(255,255,255,0.18);
  --glass-blur: blur(24px);

  --grad-fitness:      linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --grad-wellness:     linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --grad-mindfulness:  linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
  --grad-sports:       linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  --grad-diet:         linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  --grad-learning:     linear-gradient(135deg, #fccb90 0%, #d57eeb 100%);
  --grad-sleep:        linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --grad-productivity: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --grad-custom:       linear-gradient(135deg, #f7971e 0%, #ffd200 100%);

  --status-done:    #22c55e;
  --status-missed:  #ef4444;
  --status-pending: #f59e0b;

  --font-display: 'Syne', sans-serif;
  --font-body:    'DM Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --text-primary:   #f8fafc;
  --text-secondary: rgba(248,250,252,0.55);
  --text-muted:     rgba(248,250,252,0.30);

  --radius-card: 20px;
  --radius-pill: 100px;
  --radius-btn:  12px;
}
```

Google Fonts (index.html):
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
```

### Auth Page Styles

```css
.auth-bg {
  background: var(--bg-primary);
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(240,147,251,0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(79,172,254,0.08) 0%, transparent 60%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.auth-card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
}

.auth-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 0.875rem 1rem;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}
.auth-input:focus {
  border-color: rgba(240,147,251,0.5);
  box-shadow: 0 0 0 3px rgba(240,147,251,0.1);
}
.auth-input.error { border-color: rgba(239,68,68,0.5); }
```

---

## ANIMATIONS (Framer Motion)

```typescript
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } }
};

const doneAnimation = { scale: [1, 1.04, 0.98, 1], transition: { duration: 0.35 } };

const containerVariants = { animate: { transition: { staggerChildren: 0.08 } } };
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};
// Progress bars: motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
// transition: { duration: 0.8, ease: 'easeOut', delay: 0.2 }
```

---

## NAVIGATION

Bottom nav (5 tabs): Home / Activities / Goals / Streaks / Analytics
- HIDE bottom nav on /login and /register pages
- Badge dot on Goals tab if today has pending check-ins
- Settings via avatar icon top-right → /settings

---

## INSTALL COMMANDS

```bash
npm create vite@latest lifeflow -- --template react-ts
cd lifeflow

# Firebase
npm install firebase

# Core
npm install zustand react-router-dom date-fns framer-motion recharts lucide-react canvas-confetti

# DnD
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# PWA
npm install vite-plugin-pwa workbox-window

# Types
npm install -D @types/canvas-confetti

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## BUILD ORDER

```
01. Create Vite project + install all deps
02. Create .env with Firebase config (add to .gitignore immediately)
03. Create src/lib/firebase.ts
04. Configure Tailwind + CSS variables (globals.css) + Google Fonts
05. Create all TypeScript interfaces (src/shared/types/index.ts)
06. Build authService.ts + userService.ts
07. Build authStore.ts
08. Build LoginPage.tsx + RegisterPage.tsx + AuthLayout.tsx
09. Build AuthGuard.tsx
10. Wire onAuthStateChanged in App.tsx
11. Set up React Router with public + protected routes
12. Build goalsService.ts + checkInsService.ts + activitiesService.ts
13. Implement dateUtils.ts + streakUtils.ts + goalUtils.ts
14. Build goalStore.ts + checkInStore.ts (Firestore real-time listeners)
15. Build activityStore.ts + settingsStore.ts
16. Build shared components: GlassCard, CircularProgress, BottomSheet,
    ActivityHeatmap, MilestoneOverlay, CountdownTimer
17. Build BottomNavBar (hidden on /login and /register)
18. Build CheckInCard.tsx + DailyCheckIn.tsx
19. Build GoalProgressCard.tsx (HD dashboard card)
20. Build Dashboard.tsx
21. Build CreateGoalWizard.tsx (5-step)
22. Build SubGoalEditor.tsx (with dnd-kit)
23. Build GoalsList.tsx + GoalDetail.tsx + GoalCalendar.tsx
24. Build StreaksPage.tsx
25. Build ActivitiesPage.tsx + QuickLogModal
26. Build DietPage.tsx
27. Build AnalyticsPage.tsx
28. Build SettingsPage.tsx (profile + sign out)
29. Configure vite-plugin-pwa
30. Create Firestore composite indexes
31. Verify Firestore security rules are set
32. git push to GitHub → deploy on Vercel → add env vars → launch
33. Add Vercel URL to Firebase authorized domains
34. End-to-end test: register -> login -> create goal -> check-in -> logout -> login
35. Final polish: skeletons, empty states, error boundaries
```

---

## CLAUDE.md FILE

Create this at project root:

```markdown
# LifeFlow — Multi-User PWA Goal Tracker

## Architecture
Hierarchical goal system: MainGoal -> SubGoals -> DailyCheckIns
Multi-user: strict per-user data isolation via Firestore security rules.
Auth: Firebase Authentication (email/password).
DB: Firebase Firestore (free Spark plan). Hosted on Vercel.

## Stack
React 18 + TypeScript + Vite | Tailwind CSS v3 | Zustand (in-memory cache)
Firebase Auth + Firestore | Recharts | Framer Motion | Lucide React
React Router v6 | date-fns | vite-plugin-pwa | @dnd-kit/sortable | canvas-confetti

## CRITICAL RULES — Never break these
1. Every Firestore query MUST have where('userId', '==', currentUser.uid)
2. Never call Firestore from components — always use src/lib/firestore/*Service.ts
3. Never store app data in localStorage — Firestore is the source of truth
4. userId is ALWAYS the Firebase Auth UID (user.uid)
5. CheckIn document ID format: {userId}_{goalId}_{YYYY-MM-DD} (idempotent)
6. Date keys: ALWAYS YYYY-MM-DD string format — use toDateKey() util
7. SubGoals are embedded in MainGoal.subGoals[] — not a separate Firestore collection
8. Streak recalculates on every check-in submit or update
9. Stop all Firestore listeners on user logout and clear store data
10. Never commit .env file

## Auth flow
onAuthStateChanged in App.tsx -> start/stop all Firestore listeners
AuthGuard wraps all protected routes
On logout: stop listeners + clear all store data + navigate to /login

## File naming
Components: PascalCase.tsx | Hooks: use*.ts
Services: *Service.ts | Stores: *Store.ts | Types: src/shared/types/index.ts

## Adding new features
New category: add to ActivityCategory union + add --grad-{name} CSS var
New milestone: add to MILESTONES array in streakUtils.ts
New page: add route in routes.tsx + lazy import + add to nav if needed
New Firestore collection: add userId field + security rule + service file + index

## Testing
npm run build -> zero TypeScript errors
Test at 375px width (mobile-first)
Test flow: register -> login -> create goal -> check-in -> logout -> login again
Verify User A cannot see User B data (open two browsers)
```

---

## QUALITY CHECKLIST

- [ ] Register to Login to Dashboard flow works end-to-end
- [ ] User A data is invisible to User B (security rules enforced)
- [ ] Logout clears all store data, redirects to /login
- [ ] Every Firestore query has userId filter
- [ ] .env not committed to git
- [ ] Vercel env vars set and deploy succeeds
- [ ] Firebase authorized domains includes Vercel URL
- [ ] Bottom nav hidden on /login and /register
- [ ] Renders at 375px without horizontal overflow
- [ ] TypeScript: zero any, zero build errors
- [ ] Streak recalculates on every check-in
- [ ] Empty states for new users with no goals
- [ ] PWA installable on Android Chrome and iOS Safari

---

LifeFlow — Track your goals. Build your streaks. Become who you want to be.
