-- ara-eval: row-level security
-- Every table scoped to auth.uid() = user_id. Anonymous users have a real
-- auth.uid() thanks to signInAnonymously(), so the same policies apply to
-- guests and signed-in users uniformly. No DELETE policy: audit rows are
-- immutable.

ALTER TABLE ara_eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ara_ai_provider_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ara_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ara_chat_messages ENABLE ROW LEVEL SECURITY;

-- ara_eval_runs
CREATE POLICY "ara_eval_runs_select_own" ON ara_eval_runs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_eval_runs_insert_own" ON ara_eval_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_eval_runs_update_own" ON ara_eval_runs
    FOR UPDATE USING (auth.uid() = user_id);

-- ara_ai_provider_requests
CREATE POLICY "ara_ai_provider_requests_select_own" ON ara_ai_provider_requests
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_ai_provider_requests_insert_own" ON ara_ai_provider_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_ai_provider_requests_update_own" ON ara_ai_provider_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- ara_chat_sessions
CREATE POLICY "ara_chat_sessions_select_own" ON ara_chat_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_chat_sessions_insert_own" ON ara_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_chat_sessions_update_own" ON ara_chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- ara_chat_messages
CREATE POLICY "ara_chat_messages_select_own" ON ara_chat_messages
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_chat_messages_insert_own" ON ara_chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_chat_messages_update_own" ON ara_chat_messages
    FOR UPDATE USING (auth.uid() = user_id);
