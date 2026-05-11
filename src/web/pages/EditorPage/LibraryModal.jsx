import React from 'react';

const ico = (children) => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }}>
        {children}
    </svg>
);
const IconBook   = () => ico(<><path d="M2 2h5a1 1 0 0 1 1 1v11a1 1 0 0 0-1-1H2V2Z"/><path d="M14 2H9a1 1 0 0 0-1 1v11a1 1 0 0 1 1-1h5V2Z"/></>);
const IconBox    = () => ico(<><path d="M1 5l7-3 7 3v7l-7 3-7-3V5Z"/><polyline points="8,2 8,15"/><polyline points="1,5 8,8 15,5"/></>);
const IconSync   = () => ico(<><path d="M13 3.5A6 6 0 1 0 14 8"/><polyline points="11,1 14,3.5 11,6"/></>);
import { C } from '../../lib/theme';
import {
    ModalOverlay, ModalBox, ModalTitle, ModalSub,
    SourceToggle, SourceBtn,
    LibCard, LibCardBody, LibCardName, LibCardMeta, LibCardDesc,
    DiffBadge, TBtn, SmallBtn,
} from './styles';

export default function LibraryModal({
    librarySource, onSwitchSource, onRefreshGitHub,
    libraryItems, libraryLoading, libraryError,
    onImport, onClose,
}) {
    return (
        <ModalOverlay onClick={onClose}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalTitle><IconBook />Quiz Library</ModalTitle>
                <ModalSub>
                    Click Import next to any quiz to load it as a new quiz.
                </ModalSub>

                <SourceToggle>
                    <SourceBtn $active={librarySource === 'bundled'} onClick={() => onSwitchSource('bundled')}>
                        <IconBox />Bundled with app
                    </SourceBtn>
                    <SourceBtn $active={librarySource === 'github'} onClick={() => onSwitchSource('github')}>
                        <IconSync />Live from GitHub
                    </SourceBtn>
                </SourceToggle>

                {librarySource === 'github' && (
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>Fetching from <code style={{ color: C.blue }}>github.com/bautt/ponypollApp</code> — requires internet access.</span>
                        <SmallBtn onClick={onRefreshGitHub} disabled={libraryLoading} style={{ flexShrink: 0 }}>↺ Refresh</SmallBtn>
                    </div>
                )}

                {libraryLoading && (
                    <div style={{ color: C.muted, fontSize: 14, padding: '12px 0' }}>
                        {librarySource === 'github' ? <><IconSync />Fetching from GitHub…</> : 'Loading library…'}
                    </div>
                )}
                {libraryError && (
                    <div style={{ color: C.red, fontSize: 14, padding: '8px 0' }}>✗ {libraryError}</div>
                )}
                {!libraryLoading && !libraryError && (libraryItems[librarySource] || []).map((item) => (
                    <LibCard key={item.id}>
                        <LibCardBody>
                            <LibCardName>
                                {item.name}
                                <DiffBadge $diff={item.difficulty}>{item.difficulty}</DiffBadge>
                            </LibCardName>
                            <LibCardMeta>{item.questionCount} questions</LibCardMeta>
                            <LibCardDesc>{item.description}</LibCardDesc>
                        </LibCardBody>
                        <TBtn $primary onClick={() => onImport(item)} style={{ flexShrink: 0, alignSelf: 'center' }}>
                            Import
                        </TBtn>
                    </LibCard>
                ))}

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <TBtn onClick={onClose}>Close</TBtn>
                </div>
            </ModalBox>
        </ModalOverlay>
    );
}
