import { useEffect, useState } from "react";
import { api, type FinancialYear } from "../api/client";
import { Badge, Button, Card, EmptyState, Loading, PageHeader, Section } from "../components/ui";

const inp: React.CSSProperties = {
    background: "var(--surface-3)", border: "1px solid var(--border)",
    color: "var(--text)", borderRadius: 6, padding: "7px 10px",
    fontSize: 13, fontFamily: "inherit", width: "100%",
};
const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--text-3)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "block", marginBottom: 5,
};
function F({ title, children }: { title: string; children: React.ReactNode }) {
    return <div><label style={lbl}>{title}</label>{children}</div>;
}

function FYForm({ onCreated }: { onCreated: () => void }) {
    const [label, setLabel]       = useState("");
    const [start, setStart]       = useState("");
    const [end, setEnd]           = useState("");
    const [goal, setGoal]         = useState("");
    const [feedback, setFeedback] = useState("");
    const [current, setCurrent]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState("");

    const save = async () => {
        if (!label.trim() || !start || !end) return;
        setSaving(true); setError("");
        try {
            await api.financialYears.create({ label: label.trim(), startDate: start, endDate: end, orgGoal: goal || undefined, prevYearFeedback: feedback || undefined, isCurrent: current });
            setLabel(""); setStart(""); setEnd(""); setGoal(""); setFeedback(""); setCurrent(false);
            onCreated();
        } catch (e: any) {
            setError(e.message || "Failed to create");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>New Financial Year</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div style={{ gridColumn: "1/-1" }}>
                    <F title="Label">
                        <input style={inp} value={label} onChange={e => setLabel(e.target.value)} placeholder="FY 2025-26" />
                    </F>
                </div>
                <F title="Start date">
                    <input type="date" style={inp} value={start} onChange={e => setStart(e.target.value)} />
                </F>
                <F title="End date">
                    <input type="date" style={inp} value={end} onChange={e => setEnd(e.target.value)} />
                </F>
                <F title="Mark as current">
                    <div style={{ display: "flex", alignItems: "center", height: 35 }}>
                        <input type="checkbox" checked={current} onChange={e => setCurrent(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} />
                    </div>
                </F>
                <div style={{ gridColumn: "1/-1" }}>
                    <F title="Organisation goal for this year">
                        <textarea style={{ ...inp, resize: "vertical", minHeight: 72 }} value={goal}
                            onChange={e => setGoal(e.target.value)} placeholder="e.g. Ship v2, grow MAU to 10k…" />
                    </F>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                    <F title="Previous year feedback / lessons learned (optional)">
                        <textarea style={{ ...inp, resize: "vertical", minHeight: 72 }} value={feedback}
                            onChange={e => setFeedback(e.target.value)} placeholder="e.g. Sprints too long, needs better estimation…" />
                    </F>
                </div>
            </div>
            {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{error}</div>}
            <Button variant="primary" onClick={save} disabled={saving || !label.trim() || !start || !end}>
                {saving ? "Saving…" : "Create Financial Year"}
            </Button>
        </Card>
    );
}

function FYCard({ fy, onSetCurrent }: { fy: FinancialYear; onSetCurrent: (id: string) => void }) {
    return (
        <Card style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{fy.label}</span>
                    {fy.isCurrent && <Badge variant="green">Current</Badge>}
                </div>
                {!fy.isCurrent && (
                    <button onClick={() => onSetCurrent(fy.id)} style={{
                        fontSize: 11, color: "var(--text-3)", background: "transparent",
                        border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px",
                        cursor: "pointer", fontFamily: "inherit",
                    }}>Set as current</button>
                )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: fy.orgGoal ? 12 : 0 }}>
                {fy.startDate} → {fy.endDate}
            </div>
            {fy.orgGoal && (
                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Organisation Goal</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{fy.orgGoal}</div>
                </div>
            )}
            {fy.prevYearFeedback && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Previous Year Feedback</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{fy.prevYearFeedback}</div>
                </div>
            )}
        </Card>
    );
}

export default function Organisation() {
    const [fys, setFys]       = useState<FinancialYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState("");

    const load = async () => {
        setLoading(true); setError("");
        try {
            const res = await api.financialYears.list();
            setFys(res.items);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setCurrent = async (id: string) => {
        try {
            await api.financialYears.update(id, { isCurrent: true });
            load();
        } catch {}
    };

    if (loading) return <Loading text="Loading organisation…" />;

    const current = fys.find(f => f.isCurrent);
    const others = fys.filter(f => !f.isCurrent);

    return (
        <div style={{ padding: "28px 32px", maxWidth: 800, margin: "0 auto", paddingBottom: 80 }}>
            <PageHeader title="Organisation" sub="Financial years, org goals, and year-over-year feedback." />

            {error && (
                <div style={{ background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", padding: "10px 14px", borderRadius: 7, fontSize: 13, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {current && (
                <Section title="Current Financial Year">
                    <FYCard fy={current} onSetCurrent={setCurrent} />
                </Section>
            )}

            <Section title="Add Financial Year">
                <FYForm onCreated={load} />
            </Section>

            {others.length > 0 && (
                <Section title="Past Financial Years">
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {others.map(fy => <FYCard key={fy.id} fy={fy} onSetCurrent={setCurrent} />)}
                    </div>
                </Section>
            )}

            {fys.length === 0 && !loading && (
                <EmptyState icon="◈" title="No financial years yet" sub="Add your first FY above to link projects and track org goals." />
            )}
        </div>
    );
}
