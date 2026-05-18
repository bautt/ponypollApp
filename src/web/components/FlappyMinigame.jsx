/**
 * FlappyMinigame — clean-room flappy-bird mini-game for ponypoll.
 *
 * Rendered on a <canvas> element using requestAnimationFrame. All game
 * state is held in a mutable ref so the loop never triggers React renders.
 * React state is only used for the dead/score overlay so the rest of the
 * component stays outside the render cycle.
 *
 * Art: uses buttercup.png from appserver/static/ — the ponypoll mascot.
 * Audio: Web Audio API synthesised sounds; respects the app-wide SFX toggle.
 * License: original code, CC0 / MIT. Zero dependency on flappy_pony (GPLv3).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { C } from '../lib/theme';
import { isSfxEnabled } from '../lib/audio';

// ── Game constants ─────────────────────────────────────────────────────────────
const W = 360;
const H = 220;
const GROUND_H = 24;
const PONY_W = 48;
const PONY_H = 52;
const PONY_X = 56;
const GRAVITY = 0.38;
const FLAP_VY = -7.2;
const PIPE_SPEED = 2.6;
const PIPE_GAP = 82;
const PIPE_W = 44;
const PIPE_INTERVAL_FRAMES = 88;
const PIPE_COLOR_TOP = '#009CDE';
const PIPE_COLOR_BTN = '#ED8B00';
const BG = '#1B1D22';
const GROUND_BG = '#23262F';
const GROUND_LINE = '#3C3F4A';
const SCORE_COLOR = '#fff';
const MUTED_COLOR = '#868A9C';
const BEST_KEY = 'ponypoll_flappy_best';

// ── Synthesised sfx (inline — avoids modifying audio.js) ──────────────────────
function _getCtx() {
    try {
        if (!window._ponypoll_ac) {
            window._ponypoll_ac = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ac = window._ponypoll_ac;
        if (ac.state === 'suspended') ac.resume().catch(() => {});
        return ac;
    } catch (_) { return null; }
}

function sfxFlap() {
    if (!isSfxEnabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.14, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.09);
}

function sfxScore() {
    if (!isSfxEnabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.05);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
}

function sfxHit() {
    if (!isSfxEnabled()) return;
    const ctx = _getCtx(); if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf; src.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.28, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.start(ctx.currentTime);
}

// ── Styled components ──────────────────────────────────────────────────────────
const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    user-select: none;
    -webkit-user-select: none;
`;

const GameCanvas = styled.canvas`
    display: block;
    border-radius: 10px;
    border: 1px solid ${C.border};
    cursor: pointer;
    touch-action: manipulation;
    max-width: 100%;
`;

const ScoreRow = styled.div`
    display: flex;
    align-items: center;
    gap: 18px;
    font-size: 12px;
    color: ${C.muted};
`;

const ScoreBit = styled.span`
    strong { color: ${C.text}; }
`;

// ── Component ──────────────────────────────────────────────────────────────────
export default function FlappyMinigame({ dismissed = false }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const gsRef = useRef(null);         // mutable game state
    const imgRef = useRef(null);
    const imgReadyRef = useRef(false);

    const [overlay, setOverlay] = useState('start');  // 'start' | 'dead' | null
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(() => {
        try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { return 0; }
    });
    const bestRef = useRef(best);

    // Sync bestRef when best changes
    useEffect(() => { bestRef.current = best; }, [best]);

    // Load pony image once
    useEffect(() => {
        const img = new window.Image();
        img.onload = () => { imgReadyRef.current = true; };
        img.onerror = () => { imgReadyRef.current = false; };
        img.src = '/static/app/ponypollapp/buttercup.png';
        imgRef.current = img;
    }, []);

    const makeState = useCallback(() => ({
        started: false,
        dead: false,
        vy: 0,
        py: H / 2 - PONY_H / 2,
        angle: 0,
        wingPhase: 0,
        pipes: [],
        pipeTimer: PIPE_INTERVAL_FRAMES,
        score: 0,
    }), []);

    // Draw a single frame
    const draw = useCallback((gs) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        // Ethernet-cable pipe obstacles
        for (const p of gs.pipes) {
            // Top pipe
            ctx.fillStyle = PIPE_COLOR_TOP;
            ctx.fillRect(p.x, 0, PIPE_W, p.topH);
            // Cap on top pipe
            ctx.fillStyle = '#0082BB';
            ctx.fillRect(p.x - 3, p.topH - 10, PIPE_W + 6, 10);
            // Ethernet connector details on top pipe
            ctx.fillStyle = '#006699';
            ctx.fillRect(p.x + 6, p.topH - 16, PIPE_W - 12, 6);

            // Bottom pipe
            const btmY = p.topH + PIPE_GAP;
            ctx.fillStyle = PIPE_COLOR_BTN;
            ctx.fillRect(p.x, btmY, PIPE_W, H - GROUND_H - btmY);
            // Cap on bottom pipe
            ctx.fillStyle = '#C07700';
            ctx.fillRect(p.x - 3, btmY, PIPE_W + 6, 10);
            // Ethernet connector details on bottom pipe
            ctx.fillStyle = '#A06500';
            ctx.fillRect(p.x + 6, btmY + 10, PIPE_W - 12, 6);
        }

        // Ground
        ctx.fillStyle = GROUND_BG;
        ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
        ctx.strokeStyle = GROUND_LINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H - GROUND_H);
        ctx.lineTo(W, H - GROUND_H);
        ctx.stroke();
        // Ground dashes (cable run)
        ctx.strokeStyle = '#3C3F4A';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, H - GROUND_H + 10);
        ctx.lineTo(W, H - GROUND_H + 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pony
        ctx.save();
        const cx = PONY_X + PONY_W / 2;
        const cy = gs.py + PONY_H / 2;
        ctx.translate(cx, cy);
        ctx.rotate(gs.angle);
        if (imgReadyRef.current && imgRef.current) {
            ctx.drawImage(imgRef.current, -PONY_W / 2, -PONY_H / 2, PONY_W, PONY_H);
        } else {
            // Fallback: simple coloured oval
            ctx.fillStyle = '#D2691E';
            ctx.beginPath();
            ctx.ellipse(0, 0, PONY_W / 2, PONY_H / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Score during play
        if (gs.started && !gs.dead) {
            ctx.fillStyle = SCORE_COLOR;
            ctx.font = 'bold 28px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(String(gs.score), W / 2, 36);
        }

        // Start hint overlay
        if (!gs.started && !gs.dead) {
            ctx.fillStyle = 'rgba(27,29,34,0.70)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Tap to flap!', W / 2, H / 2 - 10);
            ctx.fillStyle = MUTED_COLOR;
            ctx.font = '12px system-ui';
            ctx.fillText('Guide Buttercup through the cables', W / 2, H / 2 + 12);
        }

        // Dead overlay
        if (gs.dead) {
            ctx.fillStyle = 'rgba(27,29,34,0.80)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(`Score: ${gs.score}`, W / 2, H / 2 - 18);
            ctx.fillStyle = MUTED_COLOR;
            ctx.font = '13px system-ui';
            ctx.fillText(
                gs.score >= bestRef.current && gs.score > 0 ? '🏆 New best!' : `Best: ${bestRef.current}`,
                W / 2, H / 2 + 6
            );
            ctx.fillStyle = C.blue;
            ctx.font = 'bold 13px system-ui';
            ctx.fillText('Tap to try again', W / 2, H / 2 + 28);
        }

        ctx.restore();
    }, []);

    const startLoop = useCallback(() => {
        const tick = () => {
            const gs = gsRef.current;
            if (!gs) return;

            if (gs.started && !gs.dead) {
                gs.vy += GRAVITY;
                gs.py += gs.vy;
                gs.angle = Math.max(-0.45, Math.min(0.65, gs.vy * 0.055));
                gs.wingPhase++;

                // Pipes
                gs.pipeTimer--;
                if (gs.pipeTimer <= 0) {
                    gs.pipeTimer = PIPE_INTERVAL_FRAMES;
                    const minTop = 30;
                    const maxTop = H - GROUND_H - PIPE_GAP - 30;
                    const topH = minTop + Math.random() * (maxTop - minTop);
                    gs.pipes.push({ x: W + PIPE_W, topH, passed: false });
                }
                for (const p of gs.pipes) {
                    p.x -= PIPE_SPEED;
                    if (!p.passed && p.x + PIPE_W < PONY_X) {
                        p.passed = true;
                        gs.score++;
                        setScore(gs.score);
                        sfxScore();
                    }
                }
                gs.pipes = gs.pipes.filter((p) => p.x > -PIPE_W - 10);

                // Collision
                const margin = 6;
                const hitGround = gs.py + PONY_H >= H - GROUND_H;
                const hitCeiling = gs.py < 0;
                const hitPipe = gs.pipes.some((p) => {
                    const pxLeft  = PONY_X + margin;
                    const pxRight = PONY_X + PONY_W - margin;
                    const pyTop   = gs.py + margin;
                    const pyBot   = gs.py + PONY_H - margin;
                    if (pxRight < p.x || pxLeft > p.x + PIPE_W) return false;
                    return pyTop < p.topH || pyBot > p.topH + PIPE_GAP;
                });

                if (hitGround || hitCeiling || hitPipe) {
                    if (hitGround) gs.py = H - GROUND_H - PONY_H;
                    gs.dead = true;
                    sfxHit();
                    const newBest = Math.max(gs.score, bestRef.current);
                    if (gs.score >= bestRef.current && gs.score > 0) {
                        bestRef.current = newBest;
                        setBest(newBest);
                        try { localStorage.setItem(BEST_KEY, String(newBest)); } catch (_) {}
                    }
                    setOverlay('dead');
                }
            }

            draw(gs);
            if (!gs.dead) rafRef.current = requestAnimationFrame(tick);
        };

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [draw]);

    // Mount / unmount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // HiDPI scaling
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width  = `${W}px`;
        canvas.style.height = `${H}px`;

        gsRef.current = makeState();
        setOverlay('start');
        setScore(0);
        startLoop();

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Parent signals the question phase is starting — freeze mid-game gracefully
    useEffect(() => {
        if (!dismissed) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, [dismissed]);

    const handleFlap = useCallback(() => {
        const gs = gsRef.current;
        if (!gs) return;

        if (!gs.started) {
            gs.started = true;
            gs.vy = FLAP_VY;
            setOverlay(null);
            sfxFlap();
            startLoop();
            return;
        }

        if (gs.dead) {
            // Restart
            gsRef.current = makeState();
            setScore(0);
            setOverlay(null);
            startLoop();
            return;
        }

        gs.vy = FLAP_VY;
        sfxFlap();
    }, [makeState, startLoop]);

    // Keyboard support (Space) when canvas is focused
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                handleFlap();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleFlap]);

    return (
        <Wrapper>
            <GameCanvas
                ref={canvasRef}
                onClick={handleFlap}
                onTouchStart={(e) => { e.preventDefault(); handleFlap(); }}
                aria-label="Flappy Buttercup mini-game — tap to flap"
                role="img"
            />
            <ScoreRow>
                <ScoreBit>Score <strong>{score}</strong></ScoreBit>
                <ScoreBit>Best <strong>{best}</strong></ScoreBit>
                <ScoreBit style={{ color: C.muted, fontSize: 11 }}>Space or tap to flap</ScoreBit>
            </ScoreRow>
        </Wrapper>
    );
}
