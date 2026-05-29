-- ara-eval: initial table schema
-- Namespaced with ara_ prefix to avoid collision with photocritic-site tables
-- in the shared Supabase project.

CREATE TABLE ara_eval_runs (
    run_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    model_requested TEXT NOT NULL,
    scenario_count INTEGER NOT NULL,
    personality_count INTEGER NOT NULL,
    total_calls INTEGER NOT NULL DEFAULT 0,
    successful_calls INTEGER NOT NULL DEFAULT 0,
    failed_calls INTEGER NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    python_version TEXT,
    metadata JSONB
);
CREATE INDEX idx_ara_eval_runs_user ON ara_eval_runs (user_id, started_at DESC);

CREATE TABLE ara_ai_provider_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    run_id TEXT NOT NULL REFERENCES ara_eval_runs(run_id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    request_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_requested TEXT NOT NULL,
    model_used TEXT,
    actual_provider TEXT,
    use_case TEXT NOT NULL,
    scenario_id TEXT,
    personality TEXT,
    response_status INTEGER,
    error_message TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DOUBLE PRECISION,
    response_time_ms INTEGER,
    fingerprint_string TEXT,
    gating_classification TEXT,
    gating_rules_triggered JSONB,
    raw_request JSONB,
    raw_response JSONB,
    parsed_result JSONB,
    openrouter_id TEXT,
    system_fingerprint TEXT,
    jurisdiction TEXT,
    rubric TEXT
);
CREATE INDEX idx_ara_ai_provider_requests_run ON ara_ai_provider_requests (run_id);
CREATE INDEX idx_ara_ai_provider_requests_request ON ara_ai_provider_requests (request_id);
CREATE INDEX idx_ara_ai_provider_requests_scenario ON ara_ai_provider_requests (scenario_id);
CREATE INDEX idx_ara_ai_provider_requests_scenario_personality ON ara_ai_provider_requests (scenario_id, personality);
CREATE INDEX idx_ara_ai_provider_requests_user ON ara_ai_provider_requests (user_id, created_at DESC);

CREATE TABLE ara_chat_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    model TEXT NOT NULL,
    initial_personality TEXT NOT NULL,
    initial_jurisdiction TEXT NOT NULL,
    initial_rubric TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    context_changes INTEGER NOT NULL DEFAULT 0,
    metadata JSONB
);
CREATE INDEX idx_ara_chat_sessions_user ON ara_chat_sessions (user_id, started_at DESC);

CREATE TABLE ara_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES ara_chat_sessions(session_id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    personality TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    rubric TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    response_time_ms INTEGER
);
CREATE INDEX idx_ara_chat_messages_session ON ara_chat_messages (session_id, created_at ASC);
CREATE INDEX idx_ara_chat_messages_user ON ara_chat_messages (user_id, created_at DESC);
