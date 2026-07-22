import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { campaignAPI, metricsAPI, memoAPI } from '../utils/api';
import { Calendar, TrendingUp, Pencil, Check, X, ChevronDown, ChevronRight, History, RotateCcw } from 'lucide-react';

// ---- フォーマッター ----
const fmt    = (v) => new Intl.NumberFormat('ja-JP').format(Math.round(Number(v) || 0));
const fmtYen = (v) => `¥${fmt(v)}`;
const fmtPct = (v) => `${(Number(v) || 0).toFixed(2)}%`;

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const fmtDate = (isoStr) => {
  try {
    const s = String(isoStr).split('T')[0];       // "2026-06-07"
    const [y, mo, d] = s.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);             // ローカル時刻で構築
    return `${mo}/${d} (${DAYS[dt.getDay()]})`;
  } catch (_) { return isoStr || ''; }
};

const today30ago = () => {
  const d = new Date(); d.setDate(d.getDate() - 29);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ---- ステータス設定 ----
const STATUS = {
  active:  { label: '運用中', bg: '#dcfce7', color: '#16a34a', dot: '#22c55e' },
  paused:  { label: '停止中', bg: '#fee2e2', color: '#dc2626', dot: '#ef4444' },
  testing: { label: 'テスト中', bg: '#fef9c3', color: '#ca8a04', dot: '#eab308' },
  ended:   { label: '終了',    bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
};

// ---- 指標定義 ----
const METRICS = [
  { key: 'spend',               label: '消化金額',    format: fmtYen },
  { key: 'impressions',         label: 'IMP',         format: fmt    },
  { key: 'clicks',              label: 'クリック',    format: fmt    },
  { key: 'conversions_meta',    label: 'CV (Meta)',   format: fmt    },
  { key: 'conversions_booking', label: 'CV (予約)',   format: fmt    },
  { key: 'cpa',                 label: 'CPA',         format: fmtYen },
  { key: 'cpc',                 label: 'CPC',         format: fmtYen },
  { key: 'ctr',                 label: 'CTR',         format: fmtPct },
  { key: 'cvr',                 label: 'CVR',         format: fmtPct },
];

// ---- メモの保存形式をパース ----
const parseMemo = (content) => {
  try {
    const obj = JSON.parse(content || '{}');
    if (typeof obj === 'object' && obj !== null && 'text' in obj) return obj;
  } catch (_) {}
  return { text: content || '', bold: false, color: '#1e293b' };
};
const serializeMemo = (text, bold, color) =>
  JSON.stringify({ text, bold, color });

// カラープリセット
const COLORS = [
  { label: '黒',   value: '#1e293b' },
  { label: '赤',   value: '#dc2626' },
  { label: '橙',   value: '#ea580c' },
  { label: '黄',   value: '#ca8a04' },
  { label: '緑',   value: '#16a34a' },
  { label: '青',   value: '#2563eb' },
  { label: '紫',   value: '#7c3aed' },
  { label: 'ピンク', value: '#db2777' },
];

// ---- インラインメモセル ----
const MemoCell = ({ campaignId, date, initialMemo, onSaved }) => {
  const parsed = parseMemo(initialMemo?.memo_content);
  const [editing,     setEditing]     = useState(false);
  const [text,        setText]        = useState(parsed.text);
  const [bold,        setBold]        = useState(!!parsed.bold);
  const [color,       setColor]       = useState(parsed.color || '#1e293b');
  const [saving,      setSaving]      = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history,     setHistory]     = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const ref = useRef(null);

  // initialMemoが変わったら同期
  useEffect(() => {
    const p = parseMemo(initialMemo?.memo_content);
    setText(p.text); setBold(!!p.bold); setColor(p.color || '#1e293b');
  }, [initialMemo]);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const save = async () => {
    setSaving(true);
    try {
      const content = serializeMemo(text, bold, color);
      if (initialMemo) {
        if (text.trim() === '') {
          // 削除確認ダイアログ
          if (!window.confirm('このメモを削除しますか？\n削除後も履歴から復元できます。')) {
            setSaving(false);
            return;
          }
          await memoAPI.delete(initialMemo.id);
          onSaved(date, null);
        } else {
          const res = await memoAPI.update(initialMemo.id, { campaign_id: campaignId, date, memo_content: content });
          onSaved(date, res.data);
        }
      } else if (text.trim() !== '') {
        const res = await memoAPI.create({ campaign_id: campaignId, date, memo_content: content });
        onSaved(date, res.data);
      }
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const cancel = () => {
    const p = parseMemo(initialMemo?.memo_content);
    setText(p.text); setBold(!!p.bold); setColor(p.color || '#1e293b');
    setEditing(false);
  };

  const openHistory = async (e) => {
    e.stopPropagation();
    if (!initialMemo) return;
    setShowHistory(true);
    setLoadingHist(true);
    try {
      const res = await memoAPI.getHistory(initialMemo.id);
      setHistory(res.data);
    } catch {}
    finally { setLoadingHist(false); }
  };

  const restoreHistory = (item) => {
    try {
      const p = parseMemo(item.memo_content?.replace(/^\[削除\] /, '') || '');
      setText(p.text); setBold(!!p.bold); setColor(p.color || '#1e293b');
    } catch {
      setText(item.memo_content?.replace(/^\[削除\] /, '') || '');
    }
    setShowHistory(false);
    setEditing(true);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '240px' }}>
        {/* ツールバー */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.375rem 0.5rem',
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '6px 6px 0 0', flexWrap: 'wrap'
        }}>
          {/* 太字ボタン */}
          <button
            onClick={() => setBold(b => !b)}
            title="太字"
            style={{
              width: '26px', height: '26px', borderRadius: '5px', border: 'none',
              backgroundColor: bold ? '#3b82f6' : '#e2e8f0',
              color: bold ? 'white' : '#475569',
              fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}
          >B</button>

          {/* 区切り */}
          <div style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0' }} />

          {/* カラーボタン */}
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              title={c.label}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', border: 'none',
                backgroundColor: c.value, cursor: 'pointer', flexShrink: 0,
                boxShadow: color === c.value ? `0 0 0 2px white, 0 0 0 3.5px ${c.value}` : 'none',
                transition: 'box-shadow 0.1s'
              }}
            />
          ))}
        </div>

        {/* テキストエリア */}
        <textarea
          ref={ref} value={text} onChange={e => setText(e.target.value)} rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') cancel(); }}
          style={{
            width: '100%', padding: '0.375rem 0.5rem',
            border: '1.5px solid #3b82f6', borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            fontSize: '0.78rem', resize: 'vertical', lineHeight: '1.5',
            outline: 'none', backgroundColor: '#eff6ff', fontFamily: 'inherit',
            color: color, fontWeight: bold ? '700' : '400'
          }}
        />

        {/* ボタン行 */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button onClick={save} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.25rem 0.625rem', borderRadius: '5px', border: 'none',
            backgroundColor: '#3b82f6', color: 'white', fontSize: '0.72rem',
            cursor: 'pointer', fontWeight: '600'
          }}>
            <Check size={11} /> 保存
          </button>
          <button onClick={cancel} style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            padding: '0.25rem 0.5rem', borderRadius: '5px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'white', color: 'var(--text-secondary)',
            fontSize: '0.72rem', cursor: 'pointer'
          }}>
            <X size={11} /> キャンセル
          </button>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', alignSelf: 'center', marginLeft: '0.25rem' }}>
            Enter で保存 / Shift+Enter で改行
          </span>
        </div>
      </div>
    );
  }

  // 表示モード
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.375rem',
          minWidth: '180px', maxWidth: '300px',
          padding: '0.3rem 0.4rem', borderRadius: '6px',
        }}
      >
        <div onClick={() => setEditing(true)}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          style={{ flex: 1, cursor: 'pointer', borderRadius: '5px', padding: '0.1rem 0.2rem', transition: 'background 0.1s' }}
        >
          {text ? (
            <span style={{
              fontSize: '0.78rem', lineHeight: '1.45',
              whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              color: color, fontWeight: bold ? '700' : '400'
            }}>
              {text}
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Pencil size={11} /> メモを追加
            </span>
          )}
        </div>
        {initialMemo && (
          <button onClick={openHistory} title="変更履歴" style={{
            width: '18px', height: '18px', borderRadius: '4px', border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#94a3b8', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            marginTop: '2px'
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <History size={11} />
          </button>
        )}
      </div>

      {/* 履歴パネル */}
      {showHistory && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 300,
          backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '0.75rem',
          minWidth: '260px', maxWidth: '320px', maxHeight: '260px', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>変更履歴</span>
            <button onClick={() => setShowHistory(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}><X size={13} /></button>
          </div>
          {loadingHist ? (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.5rem 0' }}>読み込み中...</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.5rem 0' }}>履歴がありません</div>
          ) : history.map(item => {
            const rawText = (() => { try { return JSON.parse(item.memo_content?.replace(/^\[削除\] /, '') || '{}').text || item.memo_content; } catch { return item.memo_content; } })();
            const isDeleted = item.memo_content?.startsWith('[削除]');
            return (
              <div key={item.id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    {new Date(item.changed_at).toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                    　{item.changed_by_name}
                  </span>
                  {!isDeleted && (
                    <button onClick={() => restoreHistory(item)} title="この内容に戻す" style={{
                      display: 'flex', alignItems: 'center', gap: '0.2rem',
                      fontSize: '0.65rem', color: '#3b82f6', background: 'none',
                      border: '1px solid #bfdbfe', borderRadius: '4px', padding: '0.1rem 0.35rem', cursor: 'pointer'
                    }}>
                      <RotateCcw size={9} /> 復元
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: isDeleted ? '#ef4444' : '#374151', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.4' }}>
                  {isDeleted ? '🗑 削除された内容: ' : ''}{rawText}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---- 当月キー ----
const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
};

// ---- 月計算ユーティリティ ----
const calcMonthTotals = (mRows) => {
  const t = mRows.reduce((acc, row) => {
    acc.spend               += Number(row.spend || 0);
    acc.impressions         += Number(row.impressions || 0);
    acc.clicks              += Number(row.clicks || 0);
    acc.conversions_meta    += Number(row.conversions_meta || 0);
    acc.conversions_booking += Number(row.conversions_booking || 0);
    return acc;
  }, { spend:0, impressions:0, clicks:0, conversions_meta:0, conversions_booking:0 });
  t.cpa = t.conversions_meta > 0 ? t.spend / t.conversions_meta : 0;
  t.cpc = t.clicks > 0 ? t.spend / t.clicks     : 0;
  t.ctr = t.impressions > 0 ? (t.clicks / t.impressions * 100) : 0;
  t.cvr = t.clicks > 0 ? (t.conversions_meta / t.clicks * 100) : 0;
  return t;
};

// ---- メインコンポーネント ----
const CampaignDetail = () => {
  const { id } = useParams();
  const [campaign,        setCampaign]        = useState(null);
  const [allRows,         setAllRows]         = useState([]);
  const [memoMap,         setMemoMap]         = useState({});
  const [selectedMonth,   setSelectedMonth]   = useState(currentMonthKey);
  const [loading,         setLoading]         = useState(true);
  const [statusMenuOpen,  setStatusMenuOpen]  = useState(false);
  const [statusUpdating,  setStatusUpdating]  = useState(false);
  const statusMenuRef = useRef(null);

  // 1年分まとめて取得
  const fetchStart = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 11); d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  })();
  const fetchEnd = todayStr();

  const isAllCampaigns = Number(id) === 1;

  useEffect(() => {
    campaignAPI.getById(id).then(r => setCampaign(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    // 全キャンペーン(id=1)はcampaign_idを指定せず全データ取得
    const metricsParams = isAllCampaigns
      ? { start_date: fetchStart, end_date: fetchEnd }
      : { campaign_id: id, start_date: fetchStart, end_date: fetchEnd };
    const memoParams = isAllCampaigns
      ? { start_date: fetchStart, end_date: fetchEnd }
      : { campaign_id: id, start_date: fetchStart, end_date: fetchEnd };

    Promise.all([
      metricsAPI.get(metricsParams),
      memoAPI.get(memoParams),
    ]).then(([mRes, memRes]) => {
      let rows = mRes.data;

      // 全キャンペーンの場合、同じ日付のデータを合算する
      if (isAllCampaigns) {
        const dateMap = {};
        rows.forEach(row => {
          const dateKey = String(row.date || '').split('T')[0];
          if (!dateMap[dateKey]) {
            dateMap[dateKey] = {
              id: dateKey, date: row.date,
              spend: 0, impressions: 0, clicks: 0,
              conversions_meta: 0, conversions_booking: 0
            };
          }
          const d = dateMap[dateKey];
          d.spend               += Number(row.spend || 0);
          d.impressions         += Number(row.impressions || 0);
          d.clicks              += Number(row.clicks || 0);
          d.conversions_meta    += Number(row.conversions_meta || 0);
          d.conversions_booking += Number(row.conversions_booking || 0);
        });
        // CPA/CPC/CTR/CVR を再計算
        rows = Object.values(dateMap).map(d => {
          return {
            ...d,
            cpa: d.conversions_meta > 0 ? d.spend / d.conversions_meta : 0,
            cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
            ctr: d.impressions > 0 ? (d.clicks / d.impressions * 100) : 0,
            cvr: d.clicks > 0 ? (d.conversions_meta / d.clicks * 100) : 0,
          };
        });
      }

      const sorted = rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setAllRows(sorted);
      const map = {};
      memRes.data.forEach(m => { map[String(m.date).split('T')[0]] = m; });
      setMemoMap(map);
    }).catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [id]);

  // 月リストを生成（データがある月）
  const monthList = (() => {
    const keys = new Set();
    allRows.forEach(row => {
      const s = String(row.date || '').split('T')[0];
      const [y, mo] = s.split('-');
      keys.add(`${y}-${mo}`);
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a)); // 新しい月が先
  })();

  // 選択月のデータ
  const rows = allRows.filter(row => {
    const s = String(row.date || '').split('T')[0];
    const [y, mo] = s.split('-');
    return `${y}-${mo}` === selectedMonth;
  });

  const handleMemoSaved = (date, memo) => {
    setMemoMap(prev => {
      const next = { ...prev };
      if (memo) next[date] = memo; else delete next[date];
      return next;
    });
  };

  const handleStatusChange = async (newStatus) => {
    if (!campaign || statusUpdating) return;
    setStatusUpdating(true);
    setStatusMenuOpen(false);
    try {
      const res = await campaignAPI.updateStatus(campaign.campaign_id, newStatus);
      setCampaign(res.data);
    } catch (e) {
      console.error('ステータス更新失敗:', e);
    } finally {
      setStatusUpdating(false);
    }
  };

  // ステータスメニュー外クリックで閉じる
  useEffect(() => {
    const handler = (e) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 選択月の合計
  const totals = rows.reduce((acc, row) => {
    acc.spend               += Number(row.spend || 0);
    acc.impressions         += Number(row.impressions || 0);
    acc.clicks              += Number(row.clicks || 0);
    acc.conversions_meta    += Number(row.conversions_meta || 0);
    acc.conversions_booking += Number(row.conversions_booking || 0);
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, conversions_meta: 0, conversions_booking: 0 });
  totals.cpa = totals.conversions_meta > 0 ? totals.spend / totals.conversions_meta : 0;
  totals.cpc = totals.clicks  > 0 ? totals.spend / totals.clicks     : 0;
  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
  totals.cvr = totals.clicks  > 0 ? (totals.conversions_meta / totals.clicks * 100)  : 0;
  const totalCV = totals.conversions_meta + totals.conversions_booking;

  const st = STATUS[campaign?.status] || STATUS.active;
  const cmk = currentMonthKey();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pickerView,   setPickerView]   = useState('month'); // 'year' | 'month'
  const [pickerYear,   setPickerYear]   = useState(() => Number(currentMonthKey().split('-')[0]));
  const dropdownRef = useRef(null);

  const monthLabel = (key) => {
    const [y, mo] = key.split('-');
    return `${y}年${Number(mo)}月`;
  };

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setPickerView('month');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ドロップダウンを開くとき選択中の年を初期表示
  const openDropdown = () => {
    const y = Number(selectedMonth.split('-')[0]);
    setPickerYear(y);
    setPickerView('month');
    setDropdownOpen(o => !o);
  };

  // データがある年一覧
  const yearList = [...new Set(monthList.map(k => Number(k.split('-')[0])))].sort((a, b) => b - a);

  // 選択中の年にあるデータ月
  const monthsInYear = monthList.filter(k => k.startsWith(`${pickerYear}-`));

  const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  return (
    <div style={{ padding: '2rem' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '4px', height: '28px', borderRadius: '4px', background: 'linear-gradient(180deg,#3b82f6,#6366f1)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {campaign?.campaign_name || 'キャンペーン詳細'}
            </h1>
            {campaign && !isAllCampaigns && (
              <div ref={statusMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setStatusMenuOpen(o => !o)}
                  disabled={statusUpdating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.25rem 0.75rem', borderRadius: '99px',
                    backgroundColor: st.bg, color: st.color, fontSize: '0.78rem', fontWeight: '700',
                    border: 'none', cursor: 'pointer', opacity: statusUpdating ? 0.6 : 1,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: st.dot }} />
                  {st.label}
                  <ChevronDown size={11} />
                </button>
                {statusMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
                    backgroundColor: 'white', border: '1px solid var(--border-color)',
                    borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    minWidth: '120px', overflow: 'hidden',
                  }}>
                    {Object.entries(STATUS).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          width: '100%', padding: '0.5rem 0.75rem', border: 'none',
                          backgroundColor: campaign.status === key ? s.bg : 'transparent',
                          color: campaign.status === key ? s.color : 'var(--text-primary)',
                          fontSize: '0.82rem', fontWeight: campaign.status === key ? '700' : '500',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                        onMouseEnter={e => { if (campaign.status !== key) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={e => { if (campaign.status !== key) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.dot, flexShrink: 0 }} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: '1rem' }}>日別パフォーマンスデータ</p>
        </div>

        {/* 月選択ドロップダウン */}
        {!loading && monthList.length > 0 && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* トリガーボタン */}
            <button
              onClick={openDropdown}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                border: `1.5px solid ${dropdownOpen ? '#3b82f6' : '#e2e8f0'}`,
                backgroundColor: dropdownOpen ? '#f8fafc' : '#ffffff',
                color: '#1e293b', fontSize: '0.875rem', fontWeight: '600',
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                transition: 'all 0.15s', minWidth: '160px', justifyContent: 'space-between'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} style={{ color: '#3b82f6' }} />
                {monthLabel(selectedMonth)}
                {selectedMonth === cmk && (
                  <span style={{ fontSize: '0.62rem', backgroundColor: '#dbeafe', color: '#3b82f6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: '700' }}>
                    今月
                  </span>
                )}
              </span>
              <ChevronDown size={14} style={{ color: '#94a3b8', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {/* ドロップダウンメニュー */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
                zIndex: 50, minWidth: '220px', padding: '0.5rem',
                animation: 'fadeInDown 0.15s ease'
              }}>

                {/* 年選択ヘッダー */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.375rem 0.5rem 0.5rem',
                  borderBottom: '1px solid #f1f5f9', marginBottom: '0.375rem'
                }}>
                  <button
                    onClick={() => setPickerView(v => v === 'year' ? 'month' : 'year')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.5rem', borderRadius: '6px', border: 'none',
                      backgroundColor: pickerView === 'year' ? '#eff6ff' : '#f8fafc',
                      color: pickerView === 'year' ? '#3b82f6' : '#374151',
                      fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {pickerYear}年
                    <ChevronDown size={12} style={{ transform: pickerView === 'year' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#94a3b8' }} />
                  </button>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {pickerView === 'year' ? '年を選択' : '月を選択'}
                  </span>
                </div>

                {/* 年選択グリッド */}
                {pickerView === 'year' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', padding: '0.125rem' }}>
                    {yearList.map(y => {
                      const isSelected = y === pickerYear;
                      const isCurrent  = y === Number(cmk.split('-')[0]);
                      return (
                        <button key={y} onClick={() => { setPickerYear(y); setPickerView('month'); }}
                          style={{
                            padding: '0.5rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: isSelected ? '700' : isCurrent ? '600' : '400',
                            backgroundColor: isSelected ? '#3b82f6' : isCurrent ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#fff' : isCurrent ? '#3b82f6' : '#374151',
                            boxShadow: isSelected ? '0 2px 6px rgba(59,130,246,0.3)' : 'none',
                            transition: 'all 0.1s'
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = isCurrent ? '#eff6ff' : 'transparent'; }}
                        >
                          {y}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 月選択グリッド */}
                {pickerView === 'month' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px', padding: '0.125rem' }}>
                    {MONTH_LABELS.map((label, i) => {
                      const mo  = i + 1;
                      const key = `${pickerYear}-${String(mo).padStart(2,'0')}`;
                      const hasData   = monthsInYear.includes(key);
                      const isSelected = key === selectedMonth;
                      const isCurrent  = key === cmk;
                      return (
                        <button key={mo}
                          onClick={() => { if (hasData) { setSelectedMonth(key); setDropdownOpen(false); setPickerView('month'); } }}
                          disabled={!hasData}
                          style={{
                            padding: '0.5rem', borderRadius: '7px', border: 'none',
                            cursor: hasData ? 'pointer' : 'default',
                            fontSize: '0.85rem', fontWeight: isSelected ? '700' : isCurrent ? '600' : '400',
                            backgroundColor: isSelected ? '#3b82f6' : isCurrent ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#fff' : !hasData ? '#d1d5db' : isCurrent ? '#3b82f6' : '#374151',
                            boxShadow: isSelected ? '0 2px 6px rgba(59,130,246,0.3)' : 'none',
                            transition: 'all 0.1s'
                          }}
                          onMouseEnter={e => { if (hasData && !isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                          onMouseLeave={e => { if (hasData && !isSelected) e.currentTarget.style.backgroundColor = isCurrent ? '#eff6ff' : 'transparent'; }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          </div>
        )}
      </div>

      {/* サマリーカード */}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
          {[
            { label: '消化金額', value: fmtYen(totals.spend), color: '#3b82f6', bg: '#eff6ff' },
            { label: 'CV合計',   value: fmt(totalCV),          color: '#10b981', bg: '#f0fdf4' },
            { label: 'CPA',      value: fmtYen(totals.cpa),    color: '#f59e0b', bg: '#fffbeb' },
            { label: 'CTR',      value: fmtPct(totals.ctr),    color: '#8b5cf6', bg: '#faf5ff' },
            { label: 'CVR',      value: fmtPct(totals.cvr),    color: '#ec4899', bg: '#fdf2f8' },
          ].map(item => (
            <div key={item.label} style={{ backgroundColor: item.bg, border: `1px solid ${item.color}22`, borderRadius: '10px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: item.color, marginBottom: '0.3rem', fontWeight: '600' }}>{item.label}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* テーブル */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <TrendingUp size={12} color="white" />
          </span>
          <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
            {loading ? '読み込み中...' : monthLabel(selectedMonth)}の日別データ
          </span>
          {!loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{rows.length}日分</span>}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>読み込み中...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>データがありません</div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
            <table className="table" style={{ minWidth: '900px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ textAlign: 'left', position: 'sticky', left: 0, top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 11, minWidth: '110px' }}>日付</th>
                  {METRICS.map(m => <th key={m.key} style={{ whiteSpace: 'nowrap', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>{m.label}</th>)}
                  {!isAllCampaigns && (
                    <th style={{ textAlign: 'left', minWidth: '220px', position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Pencil size={11} style={{ color: '#94a3b8' }} /> 運用メモ
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* 月合計行 */}
                <tr style={{ backgroundColor: '#eff6ff' }}>
                  <td style={{ position: 'sticky', left: 0, backgroundColor: '#eff6ff', fontWeight: '700', color: '#3b82f6', fontSize: '0.78rem', zIndex: 1 }}>月合計</td>
                  {METRICS.map(m => (
                    <td key={m.key} style={{ color: '#3b82f6', fontWeight: '700' }}>{m.format(totals[m.key])}</td>
                  ))}
                  {!isAllCampaigns && <td />}
                </tr>
                {/* 日別行 */}
                {rows.map(row => {
                  const dateKey = String(row.date || '').split('T')[0];
                  return (
                    <tr key={row.id}>
                      <td style={{ position: 'sticky', left: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1, fontWeight: '500', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {fmtDate(row.date)}
                      </td>
                      {METRICS.map(m => {
                        const val = row[m.key];
                        const isZeroCV = m.key === 'conversions_meta' && Number(val) === 0;
                        return (
                          <td key={m.key} style={{ whiteSpace: 'nowrap', position: 'relative' }}
                            title={isZeroCV ? 'CV数: 0（Metaのアトリビューション再計算により0件）' : undefined}>
                            {isZeroCV ? <span style={{ color: 'var(--text-secondary)', cursor: 'default', textDecoration: 'underline dotted' }}>0</span> : m.format(val)}
                          </td>
                        );
                      })}
                      {!isAllCampaigns && (
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <MemoCell
                            campaignId={Number(id)}
                            date={dateKey}
                            initialMemo={memoMap[dateKey] || null}
                            onSaved={handleMemoSaved}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;
