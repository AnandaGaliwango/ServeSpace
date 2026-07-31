CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    priority INT DEFAULT 0,
    status job_status DEFAULT 'pending',
    locked_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_priority_status_created
ON jobs (status, priority DESC, created_at ASC);



CREATE OR REPLACE FUNCTION get_next_job(p_worker_name VARCHAR(100) DEFAULT 'worker')
RETURNS jobs
LANGUAGE plpgsql
AS $$
DECLARE
    next_job jobs;
BEGIN
    SELECT *
    INTO next_job
    FROM jobs
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        UPDATE jobs
        SET status = 'processing',
            locked_by = p_worker_name,
            updated_at = NOW()
        WHERE id = next_job.id
        RETURNING * INTO next_job;
    END IF;

    RETURN next_job;
END;
$$;

CREATE OR REPLACE FUNCTION complete_job(p_job_id INT, p_result JSONB DEFAULT '{}'::jsonb)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE jobs
    SET status = 'completed',
        payload = COALESCE(payload, '{}'::jsonb) || COALESCE(p_result, '{}'::jsonb),
        locked_by = NULL,
        updated_at = NOW()
    WHERE id = p_job_id
      AND status = 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION reset_stuck_jobs()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE jobs
    SET status = 'pending',
        locked_by = NULL,
        updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < NOW() - INTERVAL '5 minutes';
END;
$$;

COMMENT ON FUNCTION get_next_job(VARCHAR) IS 'Fetches the next available pending job with priority ordering and row-level locking.';
COMMENT ON FUNCTION complete_job(INT, JSONB) IS 'Marks a processing job as completed and stores result payload.';
COMMENT ON FUNCTION reset_stuck_jobs() IS 'Resets jobs that remain in processing after timeout to avoid deadlocks.';

-- Concurrency strategy:
-- Use FOR UPDATE SKIP LOCKED so each worker can safely claim a different row and avoid blocking on already-locked jobs.
-- For high-concurrency environments, scale horizontally by adding more worker instances and partitioning the jobs table by status or created_at.