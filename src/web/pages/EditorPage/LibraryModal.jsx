import React from 'react';
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
                <ModalTitle>📚 Quiz Library</ModalTitle>
                <ModalSub>
                    Click Import next to any quiz to load it as a new quiz.
                </ModalSub>

                <SourceToggle>
                    <SourceBtn $active={librarySource === 'bundled'} onClick={() => onSwitchSource('bundled')}>
                        📦 Bundled with app
                    </SourceBtn>
                    <SourceBtn $active={librarySource === 'github'} onClick={() => onSwitchSource('github')}>
                        🔄 Live from GitHub
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
                        {librarySource === 'github' ? '🔄 Fetching from GitHub…' : 'Loading library…'}
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
