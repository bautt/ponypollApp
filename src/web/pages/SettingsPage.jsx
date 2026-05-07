import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { loadConfig, saveConfig, listIndexes } from '../lib/kvstore';

const C = {
    bg: '#1B1D22', surface: '#23262F', border: '#3C3F4A',
    text: '#D0D4E3', muted: '#868A9C', accent: '#5CC05C',
    blue: '#009CDE', red: '#DC4E41',
};

const Root = styled.div`
    min-height: calc(100vh - 90px);
    background: ${C.bg};
    color: ${C.text};
    font-family: 'Splunk Platform Sans', 'Proxima Nova', sans-serif;
    padding: 32px 24px;
`;

const Card = styled.div`
    max-width: 560px;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 28px 28px;
`;

const Title = styled.h2`
    margin: 0 0 24px;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
`;

const Section = styled.div`
    margin-bottom: 22px;
`;

const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-bottom: 6px;
`;

const Hint = styled.p`
    font-size: 12px;
    color: ${C.muted};
    margin: 4px 0 0;
`;

const Input = styled.input`
    width: 100%;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 15px;
    padding: 9px 12px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const Select = styled.select`
    width: 100%;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 6px;
    color: ${C.text};
    font-size: 14px;
    padding: 9px 12px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: ${C.blue}; }
`;

const SaveBtn = styled.button`
    padding: 10px 28px;
    border: none;
    border-radius: 8px;
    background: ${C.blue};
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    &:hover { opacity: 0.88; }
    &:disabled { opacity: 0.45; cursor: default; }
`;

const StatusMsg = styled.div`
    margin-top: 14px;
    font-size: 13px;
    color: ${({ error }) => (error ? C.red : C.accent)};
`;

const IndexNote = styled.div`
    margin-top: 14px;
    padding: 12px 16px;
    background: ${C.bg};
    border: 1px solid ${C.border};
    border-radius: 8px;
    font-size: 12px;
    color: ${C.muted};
    line-height: 1.5;
`;

export default function SettingsPage() {
    const [cfg, setCfg] = useState({ poll_index: 'ponypoll', poll_subject: 'Pony Poll' });
    const [indexes, setIndexes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [loadingIdx, setLoadingIdx] = useState(true);

    useEffect(() => {
        Promise.all([loadConfig(), listIndexes()])
            .then(([c, idxList]) => {
                setCfg({ poll_index: c.poll_index || 'ponypoll', poll_subject: c.poll_subject || 'Pony Poll' });
                setIndexes(idxList);
            })
            .catch((e) => setStatus({ error: true, msg: `Failed to load config: ${e.message}` }))
            .finally(() => setLoadingIdx(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveConfig(cfg);
            setStatus({ error: false, msg: 'Settings saved.' });
        } catch (e) {
            setStatus({ error: true, msg: e.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Root>
            <Card>
                <Title>Poll Settings</Title>

                <Section>
                    <Label>Poll title / subject</Label>
                    <Input
                        value={cfg.poll_subject}
                        onChange={(e) => setCfg({ ...cfg, poll_subject: e.target.value })}
                        placeholder="Pony Poll"
                    />
                    <Hint>Shown on the start screen and top bar during the poll.</Hint>
                </Section>

                <Section>
                    <Label>Splunk index for poll answers</Label>
                    {loadingIdx ? (
                        <Input value="Loading indexes…" readOnly />
                    ) : indexes.length > 0 ? (
                        <Select
                            value={cfg.poll_index}
                            onChange={(e) => setCfg({ ...cfg, poll_index: e.target.value })}
                        >
                            {indexes.map((idx) => (
                                <option key={idx} value={idx}>{idx}</option>
                            ))}
                        </Select>
                    ) : (
                        <Input
                            value={cfg.poll_index}
                            onChange={(e) => setCfg({ ...cfg, poll_index: e.target.value })}
                            placeholder="ponypoll"
                        />
                    )}
                    <Hint>
                        Answer events are written to this index as sourcetype&nbsp;
                        <code style={{ color: C.accent }}>ponypoll_answer</code>.
                    </Hint>
                </Section>

                <SaveBtn onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Settings'}
                </SaveBtn>

                {status && (
                    <StatusMsg error={status.error}>
                        {status.error ? '✗' : '✓'} {status.msg}
                    </StatusMsg>
                )}

                <IndexNote>
                    <strong style={{ color: C.text }}>How it works</strong><br />
                    Poll answer events are written directly to Splunk via the app's REST handler — no
                    HEC token required. The <code style={{ color: C.accent }}>ponypoll</code> index is
                    created by this app's <code>indexes.conf</code>, but you can choose any existing
                    index from the list above.<br /><br />
                    Questions and images are stored in Splunk KV Store
                    (<code style={{ color: C.accent }}>ponypoll_questions</code>) — no external
                    storage needed.
                </IndexNote>
            </Card>
        </Root>
    );
}
