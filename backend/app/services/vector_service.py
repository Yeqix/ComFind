import hashlib
import json
import math
import os
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Optional


class VectorService:
    """Local vector retrieval with an optional pgvector-ready boundary."""

    def __init__(self, dimensions: int = 64):
        self.dimensions = dimensions

    def embed_tokens(self, tokens: Iterable[str]) -> List[float]:
        vector = [0.0] * self.dimensions
        counts = Counter(tokens)
        for token, weight in counts.items():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1 if digest[4] % 2 == 0 else -1
            vector[index] += sign * (1.0 + math.log(weight))
        norm = math.sqrt(sum(value * value for value in vector))
        if norm:
            vector = [value / norm for value in vector]
        return vector

    def cosine(self, left: List[float], right: List[float]) -> float:
        if not left or not right:
            return 0.0
        return sum(a * b for a, b in zip(left, right))

    def score_tokens(self, query_tokens: Iterable[str], formula_tokens: Iterable[str]) -> float:
        return round(self.cosine(self.embed_tokens(query_tokens), self.embed_tokens(formula_tokens)), 4)

    def formula_embedding_record(self, formula, tokens: Iterable[str]) -> Dict[str, object]:
        return {
            "formula_id": str(formula.id),
            "title": formula.title,
            "category": formula.category,
            "dimensions": self.dimensions,
            "embedding": self.embed_tokens(tokens),
        }

    def build_formula_records(self, formulas, search_service) -> List[Dict[str, object]]:
        records = []
        for formula in formulas:
            tokens = search_service.extract_tokens(formula.latex)
            records.append(self.formula_embedding_record(formula, tokens))
        return records

    def _database_url(self) -> Optional[str]:
        return os.environ.get("DATABASE_URL") or os.environ.get("PGVECTOR_DATABASE_URL")
    #转为pgvector
    def _vector_literal(self, vector: List[float]) -> str:
        return "[" + ",".join(f"{value:.8f}" for value in vector) + "]"

    def _json_dump(self, value) -> str:
        def default(item):
            if hasattr(item, "model_dump"):
                return item.model_dump()
            return str(item)

        return json.dumps(value or [], ensure_ascii=False, default=default)

    def _connect(self):
        database_url = self._database_url()
        if not database_url:
            return None
        try:
            import psycopg2  # type: ignore

            return psycopg2.connect(database_url)
        except Exception:
            return None

    def sync_pgvector(self, formulas, search_service) -> Dict[str, object]:
        """Write formulas and local embeddings into PostgreSQL/pgvector when configured."""
        migration = self.migrate_pgvector()
        if not migration.get("success"):
            return {
                "success": False,
                "synced_count": 0,
                "message": f"pgvector migration failed before sync: {migration.get('message')}",
            }

        conn = self._connect()
        if conn is None:
            return {
                "success": False,
                "synced_count": 0,
                "message": "pgvector database is not configured or psycopg2 cannot connect",
            }

        records = self.build_formula_records(formulas, search_service)
        try:
            with conn:
                with conn.cursor() as cursor:
                    for formula, record in zip(formulas, records):
                        cursor.execute(
                            """
                            INSERT INTO formulas (
                                id, title, latex, normalized_expression, formula_type, category, tags,
                                description, conditions, aliases, references, related_formula_ids,
                                difficulty, proof_sketch, proof_steps, application_scenarios,
                                source, source_page, status, created_at, updated_at
                            )
                            VALUES (
                                %s, %s, %s, %s, %s, %s, %s::jsonb,
                                %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
                                %s, %s, %s::jsonb, %s::jsonb,
                                %s, %s, %s, %s, %s
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                title = EXCLUDED.title,
                                latex = EXCLUDED.latex,
                                normalized_expression = EXCLUDED.normalized_expression,
                                formula_type = EXCLUDED.formula_type,
                                category = EXCLUDED.category,
                                tags = EXCLUDED.tags,
                                description = EXCLUDED.description,
                                conditions = EXCLUDED.conditions,
                                aliases = EXCLUDED.aliases,
                                references = EXCLUDED.references,
                                related_formula_ids = EXCLUDED.related_formula_ids,
                                difficulty = EXCLUDED.difficulty,
                                proof_sketch = EXCLUDED.proof_sketch,
                                proof_steps = EXCLUDED.proof_steps,
                                application_scenarios = EXCLUDED.application_scenarios,
                                source = EXCLUDED.source,
                                source_page = EXCLUDED.source_page,
                                status = EXCLUDED.status,
                                updated_at = EXCLUDED.updated_at
                            """,
                            (
                                formula.id,
                                formula.title,
                                formula.latex,
                                formula.normalized_expression,
                                formula.formula_type,
                                formula.category,
                                self._json_dump(formula.tags),
                                formula.description,
                                formula.conditions,
                                self._json_dump(formula.aliases),
                                self._json_dump(formula.references),
                                self._json_dump(formula.related_formula_ids),
                                formula.difficulty,
                                formula.proof_sketch,
                                self._json_dump(formula.proof_steps),
                                self._json_dump(formula.application_scenarios),
                                formula.source,
                                formula.source_page,
                                formula.review_status,
                                formula.created_at,
                                formula.updated_at,
                            ),
                        )
                        cursor.execute(
                            """
                            INSERT INTO formula_embeddings (formula_id, embedding, embedding_model, dimensions, updated_at)
                            VALUES (%s, %s::vector, %s, %s, now())
                            ON CONFLICT (formula_id) DO UPDATE SET
                                embedding = EXCLUDED.embedding,
                                embedding_model = EXCLUDED.embedding_model,
                                dimensions = EXCLUDED.dimensions,
                                updated_at = now()
                            """,
                            (
                                record["formula_id"],
                                self._vector_literal(record["embedding"]),
                                "local-token-hash-v1",
                                self.dimensions,
                            ),
                        )
            return {
                "success": True,
                "synced_count": len(records),
                "message": "formulas and embeddings synced to pgvector",
            }
        except Exception as exc:
            return {
                "success": False,
                "synced_count": 0,
                "message": f"pgvector sync failed: {exc}",
            }
        finally:
            conn.close()

    def query_pgvector(self, query_tokens: Iterable[str], top_k: int = 50) -> List[Dict[str, object]]:
        """Return formula ids ranked by pgvector cosine distance. Empty means unavailable."""
        conn = self._connect()
        if conn is None:
            return []

        query_vector = self._vector_literal(self.embed_tokens(query_tokens))
        try:
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT formula_id, 1 - (embedding <=> %s::vector) AS score
                        FROM formula_embeddings
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (query_vector, query_vector, top_k),
                    )
                    return [
                        {"formula_id": str(row[0]), "score": float(row[1])}
                        for row in cursor.fetchall()
                    ]
        except Exception:
            return []
        finally:
            conn.close()

    def migrate_pgvector(self) -> Dict[str, object]:
        """Apply the bundled pgvector schema when a database is configured."""
        schema_path = Path(__file__).parent.parent / "db" / "pgvector_schema.sql"
        if not schema_path.exists():
            return {"success": False, "message": "pgvector schema file is missing"}

        conn = self._connect()
        if conn is None:
            return {
                "success": False,
                "message": "pgvector database is not configured or psycopg2 cannot connect",
            }

        try:
            sql = schema_path.read_text(encoding="utf-8")
            with conn:
                with conn.cursor() as cursor:
                    cursor.execute(sql)
            return {"success": True, "message": "pgvector schema migrated"}
        except Exception as exc:
            return {"success": False, "message": f"pgvector migration failed: {exc}"}
        finally:
            conn.close()

    def pgvector_status(self) -> Dict[str, object]:
        database_url = self._database_url()
        schema_path = Path(__file__).parent.parent / "db" / "pgvector_schema.sql"
        try:
            import psycopg2  # type: ignore  # noqa: F401

            driver_available = True
        except Exception:
            driver_available = False
        return {
            "configured": bool(database_url),
            "driver_available": driver_available,
            "schema_file": str(schema_path),
            "schema_file_exists": schema_path.exists(),
            "dimensions": self.dimensions,
            "ready": bool(database_url and driver_available),
            "migration_available": bool(database_url and driver_available and schema_path.exists()),
            "retrieval_mode": "pgvector" if database_url and driver_available else "local-token-vector",
            "message": (
                "pgvector ready"
                if database_url and driver_available
                else "using local deterministic vectors; set DATABASE_URL and install psycopg2 to enable pgvector"
            ),
        }
