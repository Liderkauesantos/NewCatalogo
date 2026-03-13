-- ============================================================
-- Implementação JWT pura em SQL usando apenas pgcrypto.
-- Equivalente 100% ao pgjwt mas sem necessidade de compilar extensão.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS jwt;

-- Encode Base64 URL-safe (padrão JWT)
CREATE OR REPLACE FUNCTION jwt.url_encode(data BYTEA)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;

-- Assinatura HMAC (suporta HS256, HS384, HS512)
CREATE OR REPLACE FUNCTION jwt.algorithm_sign(
    signables TEXT,
    secret    TEXT,
    algorithm TEXT DEFAULT 'HS256'
)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT jwt.url_encode(
    public.hmac(
      signables,
      secret,
      CASE algorithm
        WHEN 'HS256' THEN 'sha256'
        WHEN 'HS384' THEN 'sha384'
        WHEN 'HS512' THEN 'sha512'
        ELSE 'sha256'
      END
    )
  );
$$;

-- Geração do token JWT completo
CREATE OR REPLACE FUNCTION jwt.sign(
    payload   JSON,
    secret    TEXT,
    algorithm TEXT DEFAULT 'HS256'
)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  WITH
    header    AS (
      SELECT jwt.url_encode(
        convert_to('{"alg":"' || algorithm || '","typ":"JWT"}', 'utf8')
      ) AS val
    ),
    payload_b64 AS (
      SELECT jwt.url_encode(convert_to(payload::TEXT, 'utf8')) AS val
    ),
    signable AS (
      SELECT (SELECT val FROM header) || '.' || (SELECT val FROM payload_b64) AS val
    )
  SELECT
    (SELECT val FROM signable)
    || '.' ||
    jwt.algorithm_sign((SELECT val FROM signable), secret, algorithm);
$$;

-- Verificação / decode do token JWT
CREATE OR REPLACE FUNCTION jwt.verify(
    token  TEXT,
    secret TEXT,
    algorithm TEXT DEFAULT 'HS256'
)
RETURNS TABLE(header JSON, payload JSON, valid BOOLEAN) LANGUAGE SQL IMMUTABLE AS $$
  SELECT
    convert_from(
      decode(
        regexp_replace(split_part(token, '.', 1), '-', '+', 'g') || '==',
        'base64'
      ), 'utf8'
    )::JSON AS header,
    convert_from(
      decode(
        regexp_replace(split_part(token, '.', 2), '-', '+', 'g') || '==',
        'base64'
      ), 'utf8'
    )::JSON AS payload,
    split_part(token, '.', 3) = jwt.algorithm_sign(
      split_part(token, '.', 1) || '.' || split_part(token, '.', 2),
      secret, algorithm
    ) AS valid;
$$;
