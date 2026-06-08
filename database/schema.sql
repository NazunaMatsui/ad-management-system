-- ============================================
-- 広告費管理システム データベーススキーマ
-- ============================================

-- ユーザーテーブル
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャンペーンテーブル
CREATE TABLE campaigns (
    campaign_id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(100) NOT NULL,
    meta_campaign_id VARCHAR(100), -- Meta広告のキャンペーンID
    is_group BOOLEAN DEFAULT FALSE, -- グループキャンペーンかどうか
    parent_campaign_id INTEGER REFERENCES campaigns(campaign_id), -- グループの場合の親ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日次指標テーブル
CREATE TABLE daily_metrics (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    spend DECIMAL(12, 2) DEFAULT 0, -- 消化金額
    impressions INTEGER DEFAULT 0, -- インプレッション
    clicks INTEGER DEFAULT 0, -- クリック数
    conversions_meta INTEGER DEFAULT 0, -- MetaのCV
    conversions_booking INTEGER DEFAULT 0, -- 予約システムのCV
    cpa DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN (conversions_meta + conversions_booking) > 0 
            THEN spend / (conversions_meta + conversions_booking)
            ELSE 0
        END
    ) STORED, -- CPA（自動計算）
    cpc DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN clicks > 0 
            THEN spend / clicks
            ELSE 0
        END
    ) STORED, -- CPC（自動計算）
    ctr DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN impressions > 0 
            THEN (clicks::DECIMAL / impressions * 100)
            ELSE 0
        END
    ) STORED, -- CTR（自動計算）
    cvr DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN clicks > 0 
            THEN ((conversions_meta + conversions_booking)::DECIMAL / clicks * 100)
            ELSE 0
        END
    ) STORED, -- CVR（自動計算）
    data_source VARCHAR(20) DEFAULT 'manual' CHECK (data_source IN ('manual', 'meta_api', 'booking_api')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, date) -- 1キャンペーン1日1レコードのみ
);

-- 運用メモテーブル
CREATE TABLE operation_memos (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    memo_content TEXT NOT NULL,
    created_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API設定テーブル（Meta API、予約システムAPI用）
CREATE TABLE api_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_daily_metrics_campaign ON daily_metrics(campaign_id);
CREATE INDEX idx_operation_memos_date ON operation_memos(date);
CREATE INDEX idx_operation_memos_campaign ON operation_memos(campaign_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_metrics_updated_at BEFORE UPDATE ON daily_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operation_memos_updated_at BEFORE UPDATE ON operation_memos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ挿入
-- ユーザー（パスワードは後でハッシュ化する前提）
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', 'TEMP_PASSWORD_HASH', 'admin'),
('marketer1', 'marketer1@example.com', 'TEMP_PASSWORD_HASH', 'viewer'),
('marketer2', 'marketer2@example.com', 'TEMP_PASSWORD_HASH', 'viewer');

-- キャンペーン
INSERT INTO campaigns (campaign_name, is_group, meta_campaign_id) VALUES
('グループA（合算）', TRUE, NULL),
('キャンペーンA-1', FALSE, 'META_ID_001'),
('キャンペーンA-2', FALSE, 'META_ID_002'),
('キャンペーンA-3', FALSE, 'META_ID_003'),
('キャンペーンB', FALSE, 'META_ID_004');

-- グループキャンペーンの親子関係設定
UPDATE campaigns SET parent_campaign_id = 1 WHERE campaign_id IN (2, 3, 4);

-- サンプルの日次データ（直近7日分）
INSERT INTO daily_metrics (campaign_id, date, spend, impressions, clicks, conversions_meta, conversions_booking, data_source) VALUES
-- キャンペーンA-1
(2, CURRENT_DATE - INTERVAL '6 days', 15000, 25000, 625, 15, 12, 'manual'),
(2, CURRENT_DATE - INTERVAL '5 days', 16000, 27000, 680, 17, 15, 'manual'),
(2, CURRENT_DATE - INTERVAL '4 days', 14500, 24000, 600, 14, 13, 'manual'),
(2, CURRENT_DATE - INTERVAL '3 days', 17000, 28000, 700, 18, 16, 'manual'),
(2, CURRENT_DATE - INTERVAL '2 days', 15500, 26000, 650, 16, 14, 'manual'),
(2, CURRENT_DATE - INTERVAL '1 days', 16500, 27500, 690, 17, 15, 'manual'),
(2, CURRENT_DATE, 18000, 30000, 750, 19, 17, 'manual'),

-- キャンペーンB
(5, CURRENT_DATE - INTERVAL '6 days', 20000, 35000, 875, 20, 18, 'manual'),
(5, CURRENT_DATE - INTERVAL '5 days', 21000, 37000, 925, 22, 20, 'manual'),
(5, CURRENT_DATE - INTERVAL '4 days', 19500, 34000, 850, 19, 17, 'manual'),
(5, CURRENT_DATE - INTERVAL '3 days', 22000, 38000, 950, 23, 21, 'manual'),
(5, CURRENT_DATE - INTERVAL '2 days', 20500, 36000, 900, 21, 19, 'manual'),
(5, CURRENT_DATE - INTERVAL '1 days', 21500, 37500, 940, 22, 20, 'manual'),
(5, CURRENT_DATE, 23000, 40000, 1000, 24, 22, 'manual');

-- サンプルメモ
INSERT INTO operation_memos (campaign_id, date, memo_content, created_by) VALUES
(2, CURRENT_DATE - INTERVAL '3 days', 'クリエイティブを「限定」→「今だけ」に変更。LF8の【恐怖回避】を活用。', 1),
(5, CURRENT_DATE - INTERVAL '2 days', 'ターゲティング拡大テスト開始。類似オーディエンス2%追加。', 1),
(2, CURRENT_DATE, '予算を+20%増額。パフォーマンス好調のため。', 1);
