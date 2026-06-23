CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS formulas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    latex TEXT NOT NULL,
    normalized_expression TEXT,
    category TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    conditions TEXT,
    references JSONB NOT NULL DEFAULT '[]'::jsonb,
    difficulty TEXT,
    proof_sketch TEXT,
    application_scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

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
    id BIGSERIAL PRIMARY KEY,
    query_latex TEXT NOT NULL,
    top_k INTEGER NOT NULL,
    result_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
