CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS formulas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    latex TEXT NOT NULL,
    normalized_expression TEXT,
    formula_type TEXT,
    category TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    conditions TEXT,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    references JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_formula_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    difficulty TEXT,
    proof_sketch TEXT,
    application_scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT,
    source_page INTEGER,
    status TEXT NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS formulas_status_idx ON formulas(status);
CREATE INDEX IF NOT EXISTS formulas_category_idx ON formulas(category);

CREATE TABLE IF NOT EXISTS formula_features (
    formula_id TEXT PRIMARY KEY REFERENCES formulas(id) ON DELETE CASCADE,
    symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
    operators JSONB NOT NULL DEFAULT '[]'::jsonb,
    has_summation BOOLEAN NOT NULL DEFAULT false,
    has_recurrence BOOLEAN NOT NULL DEFAULT false,
    has_generating_function BOOLEAN NOT NULL DEFAULT false,
    ast_hash TEXT,
    variable_count INTEGER NOT NULL DEFAULT 0,
    free_variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS formula_features_ast_hash_idx ON formula_features(ast_hash);

CREATE TABLE IF NOT EXISTS formula_embeddings (
    formula_id TEXT PRIMARY KEY REFERENCES formulas(id) ON DELETE CASCADE,
    embedding vector(64) NOT NULL,
    embedding_model TEXT NOT NULL DEFAULT 'local-token-hash-v1',
    dimensions INTEGER NOT NULL DEFAULT 64,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS formula_embeddings_cosine_idx
    ON formula_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE TABLE IF NOT EXISTS search_logs (
    id TEXT PRIMARY KEY,
    input_formula TEXT NOT NULL,
    normalized_formula TEXT,
    result_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_reviews (
    id TEXT PRIMARY KEY,
    formula_id TEXT NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    reviewer_id TEXT,
    action TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_reviews_formula_id_idx ON admin_reviews(formula_id);

CREATE TABLE IF NOT EXISTS llm_call_logs (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT,
    model TEXT,
    endpoint TEXT,
    purpose TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    response_time_ms DOUBLE PRECISION,
    error_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
