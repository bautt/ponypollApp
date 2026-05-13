/**
 * <WordcloudInput /> — shared input box for word-cloud questions.
 *
 * Used by both self-paced (PollPage/ActiveScreen) and synchronized
 * (SyncPollPage/QuestionScreen) participant views. The host word-cloud
 * visualisation is separate (AdminPage/WordCloud.jsx).
 *
 * Props
 *   q         – question doc (uses wordcloudMaxChars + wordcloudMaxWords)
 *   wcWords   – string[] of currently entered words
 *   setWcWords / setWcInput – React state setters
 *   wcInput   – current text in the input
 *   locked    – true once the participant has submitted or time has expired;
 *               disables editing and shows the "in the cloud" hint
 *   idPrefix  – string suffix for the <input id="..."> so multiple instances
 *               on the same page don't collide
 */
import React from 'react';
import { C } from '../lib/theme';
import { normalizeWcWord } from '../lib/utils';

export default function WordcloudInput({
    q, wcWords, setWcWords, wcInput, setWcInput, locked, idPrefix = 'wc-input',
}) {
    const maxChars = q.wordcloudMaxChars ?? 32;
    const maxWords = q.wordcloudMaxWords ?? 7;
    const full     = wcWords.length >= maxWords;
    const inputId  = idPrefix;

    const tryAdd = (raw) => {
        const w = normalizeWcWord(raw);
        if (w && !wcWords.includes(w) && wcWords.length < maxWords) {
            setWcWords((prev) => [...prev, w]);
        }
        setWcInput('');
    };

    return (
        <div>
            <div
                onClick={() => document.getElementById(inputId)?.focus()}
                style={{
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                    gap: 6, padding: '10px 14px', minHeight: 52,
                    background: C.surface2,
                    border: `1px solid ${locked ? C.border : C.blue}`,
                    borderRadius: 8, cursor: 'text',
                }}
            >
                {wcWords.map((w, i) => (
                    <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: C.blue + '33', border: `1px solid ${C.blue}`,
                        borderRadius: 20, padding: '2px 8px 2px 11px',
                        fontSize: 14, color: C.text, whiteSpace: 'nowrap',
                    }}>
                        {w}
                        {!locked && (
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setWcWords((prev) => prev.filter((_, j) => j !== i))}
                                style={{
                                    background: 'none', border: 'none', color: C.muted,
                                    cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1,
                                }}
                            >×</button>
                        )}
                    </span>
                ))}
                {!locked && !full && (
                    <input
                        id={inputId}
                        value={wcInput}
                        maxLength={maxChars}
                        placeholder={wcWords.length === 0 ? 'Type a word, press Space to add…' : 'next word…'}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val.endsWith(' ')) tryAdd(val);
                            else setWcInput(val);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter')  { e.preventDefault(); tryAdd(wcInput); }
                            if (e.key === 'Backspace' && wcInput === '') {
                                e.preventDefault();
                                setWcWords((prev) => prev.slice(0, -1));
                            }
                        }}
                        style={{
                            flex: '1 1 120px', minWidth: 80, background: 'transparent',
                            border: 'none', outline: 'none', color: C.text,
                            fontSize: 15, padding: '2px 4px',
                        }}
                    />
                )}
                {(locked || full) && wcWords.length === 0 && (
                    <span style={{ color: C.muted, fontSize: 13 }}>No words submitted</span>
                )}
            </div>

            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginTop: 7, gap: 8,
            }}>
                {!locked && (
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                        <strong style={{ color: C.text }}>Space</strong> or <strong style={{ color: C.text }}>Enter</strong> adds a word &nbsp;·&nbsp;
                        <strong style={{ color: C.text }}>Backspace</strong> removes last &nbsp;·&nbsp;
                        use <strong style={{ color: C.text }}>word_word</strong> or <strong style={{ color: C.text }}>"two words"</strong> for phrases
                    </div>
                )}
                <div style={{
                    fontSize: 11, color: full ? C.green : C.muted,
                    whiteSpace: 'nowrap', marginLeft: 'auto',
                }}>
                    {wcWords.length} / {maxWords}
                    {full && !locked && ' — submit when ready'}
                </div>
            </div>
        </div>
    );
}
