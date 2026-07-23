-- Cron 朝報の実行状態および物理的一意制約を管理する専用テーブル
CREATE TABLE IF NOT EXISTS cron_report_executions (
  report_date DATE PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  execution_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS cron_report_executions_status_idx
  ON cron_report_executions (status);
