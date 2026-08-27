-- Core Product Architecture: ISSEN-Killer (Phase 1)
-- Learner Model, Auth, and Memory State

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for semantic memory

-- 1. USERS & AUTH
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE
);

-- 2. LEARNER PROFILES (The Core Engine)
CREATE TABLE learner_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    native_language VARCHAR(50) NOT NULL,
    target_language VARCHAR(50) NOT NULL,
    target_dialect VARCHAR(50),
    
    -- Global Estimates
    overall_cefr_estimate VARCHAR(2), -- A1, A2, B1, B2, C1, C2
    speaking_cefr VARCHAR(2),
    listening_cefr VARCHAR(2),
    grammar_cefr VARCHAR(2),
    vocabulary_cefr VARCHAR(2),
    
    -- Preferences
    correction_style VARCHAR(50) DEFAULT 'balanced', -- light, balanced, strict, none
    preferred_difficulty VARCHAR(50) DEFAULT 'adaptive',
    
    -- Progress & Stats
    spoken_minutes INT DEFAULT 0,
    session_count INT DEFAULT 0,
    active_days INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_language)
);

-- 3. LEARNER KNOWLEDGE GRAPH (Vocabulary)
CREATE TYPE knowledge_state AS ENUM (
    'UNKNOWN', 'EXPOSED', 'RECOGNIZED', 'UNDERSTOOD', 
    'PARTIALLY_KNOWN', 'RECALLABLE', 'USABLE', 'AUTOMATIC', 'MASTERED'
);

CREATE TABLE learner_vocabulary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID REFERENCES learner_profiles(id) ON DELETE CASCADE,
    lemma VARCHAR(100) NOT NULL,
    surface_form VARCHAR(100),
    pos VARCHAR(50),
    state knowledge_state DEFAULT 'EXPOSED',
    
    -- SRS Engine Stats (FSRS equivalent)
    stability FLOAT DEFAULT 0,
    difficulty FLOAT DEFAULT 5.0,
    retrievability FLOAT DEFAULT 0,
    interval_days FLOAT DEFAULT 0,
    last_review TIMESTAMP WITH TIME ZONE,
    next_review TIMESTAMP WITH TIME ZONE,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    
    -- Context
    first_seen_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. RECURRING ERROR ENGINE
CREATE TABLE learner_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID REFERENCES learner_profiles(id) ON DELETE CASCADE,
    error_category VARCHAR(50), -- grammar, vocabulary, pronunciation
    error_subtype VARCHAR(100), -- e.g., 'past_participial_form'
    
    occurrences INT DEFAULT 1,
    successful_corrections INT DEFAULT 0,
    failed_corrections INT DEFAULT 0,
    
    severity FLOAT DEFAULT 0.5,
    is_recurring BOOLEAN DEFAULT false,
    
    last_seen_context TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SEMANTIC EPISODIC MEMORY (Vector DB)
CREATE TABLE episodic_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID REFERENCES learner_profiles(id) ON DELETE CASCADE,
    memory_type VARCHAR(50), -- personal_fact, goal, scenario_history
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI embeddings or similar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_vocab_next_review ON learner_vocabulary(next_review);
CREATE INDEX idx_vocab_learner ON learner_vocabulary(learner_id);
CREATE INDEX idx_errors_learner ON learner_errors(learner_id);
