# 🏛️ Dygo Academy: Master System Architecture Specification
**Document Version**: 5.0 (Definitive Master Blueprint)  
**Author**: Principal Cloud & SaaS Solutions Advisory  
**Status**: Ready for Direct Engineering Execution  

---

# PART 1: MASTER HIGH-LEVEL ARCHITECTURE (MAJOR BLOCKS ONLY)

A clean, executive-level view of the major building blocks in the Dygo Academy ecosystem:

```mermaid
graph TD
    %% 1. CLIENT BLOCK
    subgraph ClientBlock ["📱 1. Client Layer (Multi-Platform)"]
        Web["💻 Next.js 14/15 Web App"]
        Mobile["📱 Mobile App (iOS & Android)"]
    end

    %% 2. APPLICATION & WORKER BLOCK
    subgraph AppBlock ["⚙️ 2. Application & Worker Layer (NestJS)"]
        API["⚡ REST API Gateway + Auth Guard"]
        Workers["🤖 Asynchronous Job Workers (AI, Audio & Push)"]
    end

    %% 3. MANAGED CLOUD & DATA BLOCK
    subgraph CloudBlock ["☁️ 3. Managed Cloud & Infrastructure Layer"]
        Supabase["🗄️ Supabase (PostgreSQL + Auth + Storage)"]
        Redis["⚡ Redis (BullMQ Queues & Review Cache)"]
        Gemini["🧠 Google Gemini 1.5 Flash AI"]
        Stripe["💳 Stripe Billing (Tiered Seat Subscriptions)"]
        R2["☁️ Cloudflare R2 (Audio Storage with $0 Egress)"]
    end

    %% MAJOR BLOCK FLOWS
    ClientBlock -->|1. Sign In / OAuth| Supabase
    ClientBlock -->|2. API Requests + Bearer JWT| API
    
    API -->|Read / Write Data| Supabase
    API -->|3. Offload Tasks in <50ms| Redis
    
    Redis -->|Pull Jobs| Workers
    Workers --> Gemini
    Workers -->|Save Audio .mp3| R2
    Workers -->|Save Enriched Data| Supabase
    Workers -->|4. Dispatch Push Alerts| ClientBlock

    API <-->|Manage Seat Billing| Stripe
```

---

# PART 2: DETAILED SUBSYSTEM ARCHITECTURES

---

## 1. 💻 Frontend Subsystem Architecture (Web & Mobile)

```mermaid
graph TD
    subgraph ViewLayer ["1. UI & View Layer (Tailwind CSS + shadcn/ui)"]
        TopicExplorer["📚 Topics & Class Explorer (Public & Private)"]
        CardPlayer["🗂️ 3D SRS Flashcard Player (With Progressive Hints)"]
        QuizEngine["✍️ Dynamic Quiz Engine (Cloze, Audio Dictation, Match)"]
        SeatDashboard["🎟️ Seat Management Dashboard (For Teachers / Admins)"]
        SettingsView["⏰ Push Reminder & Daily Habit Settings"]
    end

    subgraph StateLayer ["2. Client State & Caching Engine"]
        ZustandStore["⚡ Zustand (Active Card Session & Rating State)"]
        TanStackQuery["🔄 TanStack Query (API Cache & Optimistic Updates)"]
        SQLiteCache["💾 Local SQLite (100% Offline Mobile Card Sync)"]
    end

    subgraph NetworkLayer ["3. SDK & Transport Layer"]
        SupabaseSDK["🔐 Supabase Auth SDK (Session Management)"]
        NestClient["🌐 Typed API Client (NestJS REST Endpoints)"]
        ServiceWorker["🔔 Service Worker (Web Push VAPID Handler)"]
    end

    ViewLayer --> StateLayer
    StateLayer --> NetworkLayer
```

### Engineering Details:
1. **Next.js 14/15 App Router**: Server Components deliver sub-second initial load and perfect SEO for public vocabulary sets.
2. **Offline-First Mobile Sync**: Mobile clients pre-fetch the daily 20 due cards into local SQLite; review logs sync automatically when internet connectivity returns.
3. **Progressive Clue Engine**: Flashcard player reveals hints step-by-step (First-Letter $\rightarrow$ IPA $\rightarrow$ Audio $\rightarrow$ Context Sentence).

---

## 2. ⚙️ Backend Subsystem Architecture (NestJS Modular Monolith)

```mermaid
graph LR
    subgraph Ingress ["1. API Ingress"]
        JWTGuard["🛡️ Supabase JWT Guard (<0.2ms In-Memory)"]
        Validation["🔍 ValidationPipe (class-validator DTOs)"]
    end

    subgraph Modules ["2. Domain Modules (Clean Architecture)"]
        TopicModule["📁 TopicsModule (Public/Private RBAC)"]
        WordModule["📝 WordsModule (Instant Ingestion <50ms)"]
        SRSModule["🧠 SrsModule (Error-Adaptive Engine)"]
        SeatModule["🎟️ SeatSubscriptionModule (Stripe & Seats)"]
        NotifModule["🔔 NotificationModule (Push Dispatcher)"]
    end

    subgraph Queues ["3. Asynchronous Job Dispatch"]
        EnrichQueue["⚡ enrichment-queue (Redis)"]
        CronQueue["⏰ notification-cron-queue (Redis)"]
    end

    Ingress --> Modules
    WordModule -->|Dispatch Job| EnrichQueue
    NotifModule --> CronQueue
```

### Engineering Details:
1. **Sub-50ms Response Time**: Word ingestion immediately responds `201 Created` with status `ENRICHING`; heavy AI/audio processing runs in BullMQ.
2. **Automatic Swagger API Docs**: Interactive API console at `/api/docs` enables rapid frontend & mobile development with zero manual documentation effort.

---

## 3. 🤖 Jobs & Asynchronous Worker Architecture (BullMQ + Redis)

```mermaid
graph LR
    subgraph JobProducers ["1. Job Dispatchers"]
        WordAdd["POST /words (New word added)"]
        CronTick["Cron Heartbeat (Every 15 mins)"]
    end

    subgraph RedisQueues ["2. BullMQ Queues (Redis)"]
        Q_Enrich["⚡ enrichment-queue"]
        Q_Notif["⏰ notification-queue"]
    end

    subgraph WorkerFleet ["3. Worker Processors"]
        W_Enrich["EnrichmentProcessor"]
        W_Notif["NotificationProcessor"]
    end

    subgraph ExternalExec ["4. Execution & Cloud Storage"]
        Gemini["🧠 Google Gemini 1.5 Flash"]
        TTS["🔊 Neural TTS Engine"]
        R2["☁️ Cloudflare R2 ($0 Egress)"]
        VAPID["🔔 Web Push Server"]
    end

    WordAdd --> Q_Enrich --> W_Enrich
    W_Enrich --> Gemini & TTS --> R2
    
    CronTick --> Q_Notif --> W_Notif --> VAPID
```

### Engineering Details:
* **Global Master Lexicon Cache**: Before calling AI, the worker checks if the word already exists in `master_lexicon`. If it exists, existing IPA, audio, and examples are reused, **saving 90% in AI & TTS API costs**.

---

## 4. 🔔 Push Notification & Scheduling Subsystem Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Browser as Web Browser (Service Worker)
    participant Nest as NestJS API
    participant Cron as Timezone Cron Worker (BullMQ)
    participant WebPush as Web Push Server (VAPID API)

    Student->>Browser: Enables Daily 8:00 PM Reminder
    Browser->>Nest: POST /notifications/subscribe (endpoint, p256dh, auth)
    Nest->>Nest: Stores in push_subscriptions table
    
    Note over Cron: Runs every 15 mins across global timezones
    Cron->>Nest: Evaluates active schedules matching local 8:00 PM
    Nest->>WebPush: Sends encrypted VAPID push payload
    WebPush-->>Browser: Service Worker fires Push Event
    Browser-->>Student: Displays: "🔔 18 words due today! Keep your streak alive! [Start Review]"
    
    Student->>Browser: Taps Notification
    Browser->>Nest: Direct navigation to https://app.dygo.academy/study
```

### Core Notification Types:
1. **Daily Study Habit**: Sent at user's local configured hour (e.g., 8:00 PM).
2. **Teacher Class Sprint**: Class-wide alerts for homework deadlines.
3. **Streak Protection**: Evening alerts if a student has an active streak $\ge 3$ days.
4. **Leech Word Remedial**: Alerts suggesting a quick 3-minute drill for repeatedly missed words.

---

## 5. 🗄️ Supabase Subsystem Architecture (PostgreSQL, Auth & RLS)

```mermaid
erDiagram
    TENANTS ||--o{ TENANT_SEATS : allocates
    TENANTS ||--o{ PROFILES : contains
    PROFILES ||--o{ TENANT_SEATS : assigned_to
    GROUPS ||--o{ GROUP_MEMBERS : contains
    PROFILES ||--o{ GROUP_MEMBERS : belongs_to
    GROUPS ||--o{ TOPICS : organizes
    TOPICS ||--o{ TOPIC_WORDS : has
    MASTER_LEXICON ||--o{ TOPIC_WORDS : deduplicates
    PROFILES ||--o{ USER_WORD_SRS : tracks_progress
    TOPIC_WORDS ||--o{ USER_WORD_SRS : evaluated_in
    PROFILES ||--o{ STUDY_SCHEDULES : configures
    PROFILES ||--o{ PUSH_SUBSCRIPTIONS : registers

    TENANTS {
        uuid id PK
        string name "Personal / School Workspace"
        int purchased_seats "Total paid seats"
        int active_seats_used "Currently assigned seats"
        int price_per_seat_cents
    }

    TENANT_SEATS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string status "ACTIVE | REVOKED"
        timestamp assigned_at
    }

    PROFILES {
        uuid id PK "references auth.users(id)"
        uuid tenant_id FK
        string email
        int daily_srs_goal
    }

    MASTER_LEXICON {
        uuid id PK
        string normalized_word UK
        string language_code
        string ipa_us
        string ipa_uk
        string audio_url
        jsonb synonyms
        jsonb antonyms
        jsonb example_sentences
    }

    GROUPS {
        uuid id PK
        uuid tenant_id FK
        string name
        boolean is_public
    }

    GROUP_MEMBERS {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        string role "ADMIN | WRITE | READ"
    }

    TOPICS {
        uuid id PK
        uuid group_id FK
        string title
        boolean is_public
    }

    TOPIC_WORDS {
        uuid id PK
        uuid topic_id FK
        uuid lexicon_id FK
        string status "ENRICHING | READY"
    }

    USER_WORD_SRS {
        uuid id PK
        uuid user_id FK
        uuid topic_word_id FK
        float ease_factor
        int interval_days
        int total_mistakes
        boolean is_leech
        timestamp next_due_at
    }

    STUDY_SCHEDULES {
        uuid id PK
        uuid user_id FK
        time reminder_time
        string timezone
    }

    PUSH_SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        string endpoint UK
        string p256dh_key
        string auth_key
    }
```

### Key Database Components:
1. **Sub-5ms Partial Index for Daily Due Cards**:
   ```sql
   CREATE INDEX idx_srs_due_fast ON public.user_word_srs (user_id, next_due_at)
   WHERE next_due_at <= NOW();
   ```
2. **Partitioned Historical Tables**: `review_logs` partitioned by month to ensure sub-10ms query execution across billions of review logs.
3. **Row-Level Security (RLS)**: Enforces access control at the database layer; students can only view topics they own or have an active sponsored seat in.

---

## 6. 💳 Subscription & Stripe Billing Subsystem Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher / School Buyer
    participant Client as Next.js Web App
    participant Nest as NestJS API
    participant Stripe as Stripe Billing Engine
    participant DB as PostgreSQL DB

    Note over Teacher,Stripe: 1. Initial Seat Purchase
    Teacher->>Client: Selects "Tutor Pack (20 Seats)"
    Client->>Nest: POST /billing/create-checkout-session { quantity: 20 }
    Nest->>Stripe: stripe.checkout.sessions.create({ mode: 'subscription', quantity: 20 })
    Stripe-->>Client: Returns Stripe Checkout URL
    Teacher->>Stripe: Enters Card $\rightarrow$ Subscribes $79.80 / mo (Auto-Discounted)
    
    Note over Stripe,DB: Webhook: Subscription Created
    Stripe->>Nest: Webhook: customer.subscription.created
    Nest->>DB: 1. Upsert tenant_subscriptions (status: 'ACTIVE', quantity: 20)<br/>2. Update tenants (purchased_seats = 20)
    
    Note over Stripe,DB: 2. Automated Monthly Renewal (Day 30)
    Stripe->>Stripe: Auto-charges saved card on renewal date
    Stripe->>Nest: Webhook: invoice.payment_succeeded
    Nest->>DB: 1. Insert subscription_invoices (status: 'PAID')<br/>2. Extend current_period_end by 1 month
```

### Unified Seat Pricing Structure:
* **Solo Learner (1 Seat)**: **\$7.99 / mo**
* **Online Tutor (5 – 30 Seats)**: **\$3.99 / seat / mo** (50% Volume Discount)
* **Language Academy (31 – 150 Seats)**: **\$2.49 / seat / mo** (68% Volume Discount)
* **School District (151+ Seats)**: **\$1.49 / seat / mo** (80% Bulk Discount)
* **Frictionless Student Onboarding**: Students invited by a teacher/school join **100% FREE** with zero payment screens.
