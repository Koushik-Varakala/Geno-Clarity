'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { RefreshCw, Zap, Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface DigitalTwinProps {
    data: any[];
}

// Drug-specific PK parameters (literature-based approximations)
// D = dose (mg), F = bioavailability, Vd = vol of distribution (L), ka = absorption rate constant (/h)
// ke base (Normal Metabolizer), toxicity threshold (mg/L), efficacy floor (mg/L)
const DRUG_PK_PARAMS: Record<string, {
    D: number; F: number; Vd: number; ka: number; ke_normal: number;
    toxicity: number; efficacy: number; unit: string; halfLifeHr: number;
}> = {
    CODEINE: { D: 30, F: 0.9, Vd: 200, ka: 1.5, ke_normal: 0.35, toxicity: 0.25, efficacy: 0.05, unit: 'µg/L', halfLifeHr: 3 },
    WARFARIN: { D: 5, F: 0.9, Vd: 10, ka: 0.6, ke_normal: 0.04, toxicity: 3.0, efficacy: 0.8, unit: 'mg/L', halfLifeHr: 36 },
    CLOPIDOGREL: { D: 75, F: 0.5, Vd: 400, ka: 1.2, ke_normal: 0.6, toxicity: 0.6, efficacy: 0.1, unit: 'µg/L', halfLifeHr: 6 },
    SIMVASTATIN: { D: 40, F: 0.05, Vd: 580, ka: 1.0, ke_normal: 1.5, toxicity: 0.12, efficacy: 0.02, unit: 'µg/L', halfLifeHr: 2 },
    AZATHIOPRINE: { D: 100, F: 0.8, Vd: 45, ka: 1.3, ke_normal: 0.35, toxicity: 8.0, efficacy: 2.0, unit: 'mg/L', halfLifeHr: 5 },
    FLUOROURACIL: { D: 500, F: 1.0, Vd: 22, ka: 2.0, ke_normal: 0.9, toxicity: 300, efficacy: 80, unit: 'µg/L', halfLifeHr: 0.5 },
    AMIODARONE: { D: 200, F: 0.5, Vd: 5000, ka: 0.3, ke_normal: 0.003, toxicity: 3.5, efficacy: 1.0, unit: 'mg/L', halfLifeHr: 40 },
    CITALOPRAM: { D: 20, F: 0.8, Vd: 400, ka: 0.5, ke_normal: 0.04, toxicity: 0.5, efficacy: 0.05, unit: 'mg/L', halfLifeHr: 35 },
    OMEPRAZOLE: { D: 20, F: 0.65, Vd: 35, ka: 0.8, ke_normal: 0.7, toxicity: 2.5, efficacy: 0.3, unit: 'mg/L', halfLifeHr: 1.5 },
    PHENYTOIN: { D: 300, F: 0.9, Vd: 45, ka: 0.4, ke_normal: 0.03, toxicity: 25, efficacy: 10, unit: 'mg/L', halfLifeHr: 22 },
};

// Determine the ke modifier based on phenotype and whether the drug is a prodrug
// Prodrugs: lower ke means LESS activation, higher ke means over-activation
const getKeModifier = (phenotype: string, isProdrug: boolean): number => {
    const p = phenotype.toLowerCase();
    if (isProdrug) {
        // For prodrugss, ke represents activation rate
        if (p.includes('poor') || p.includes('no function')) return 0.15; // Much less activation
        if (p.includes('intermediate') || p.includes('decreased')) return 0.55; // Reduced activation
        if (p.includes('ultrarapid') || p.includes('ultra')) return 2.2; // Excessive activation
        if (p.includes('rapid')) return 1.5;
        return 1.0; // Normal
    } else {
        // Standard clearance drugs: ke represents how fast the drug is eliminated
        if (p.includes('poor') || p.includes('no function')) return 0.2; // Much slower clearance → accumulation
        if (p.includes('intermediate') || p.includes('decreased')) return 0.5; // Slower clearance
        if (p.includes('ultrarapid') || p.includes('ultra')) return 2.0; // Rapid clearance → sub-therapeutic
        if (p.includes('rapid')) return 1.5;
        return 1.0; // Normal
    }
};

// Drugs that are prodrugss (activation-based, not clearance-based)
const PRODRUG_SET = new Set(['CODEINE', 'CLOPIDOGREL']);

const generatePKData = (drug: string, phenotype: string, timeWindow: number = 24) => {
    const params = DRUG_PK_PARAMS[drug] ?? {
        D: 100, F: 0.8, Vd: 50, ka: 1.2, ke_normal: 0.25,
        toxicity: 8.0, efficacy: 2.0, unit: 'mg/L', halfLifeHr: 6
    };

    const { D, F, Vd, ka, ke_normal, toxicity, efficacy } = params;
    const isProdrug = PRODRUG_SET.has(drug);
    const keModifier = getKeModifier(phenotype, isProdrug);
    const ke = ke_normal * keModifier;

    // For prodrugs the "metabolite" concentration is proportional to the ke (activation rate)
    // We model the parent drug concentration (declines) and an active metabolite curve

    const step = timeWindow / 48; // 48 data points
    const result = [];

    for (let t = 0; t <= timeWindow; t += step) {
        // One-compartment oral model:
        // C(t) = (D·F / Vd) · (ka / (ka - ke)) · (e^(-ke·t) - e^(-ka·t))
        let concentration = 0;
        if (Math.abs(ka - ke) > 0.001) {
            concentration = (D * F / Vd) * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
        }
        concentration = Math.max(0, concentration);

        // For prodrugss: also compute the "active metabolite" concentration (simplified)
        let metabolite: number | null = null;
        if (isProdrug) {
            // Active metabolite rises as prodrug is activated, then clears
            const kmet = ke * 0.4;
            metabolite = concentration * (1 - Math.exp(-kmet * t)) * keModifier * 0.3;
            metabolite = Math.max(0, metabolite);
        }

        result.push({
            time: parseFloat(t.toFixed(2)),
            concentration: parseFloat(concentration.toFixed(4)),
            ...(isProdrug ? { metabolite: parseFloat((metabolite ?? 0).toFixed(4)) } : {}),
            toxicity,
            efficacy
        });
    }

    return result;
};

const formatTooltipValue = (value: number, name: string, drug: string) => {
    const unit = DRUG_PK_PARAMS[drug]?.unit ?? 'mg/L';
    return [`${value.toFixed(3)} ${unit}`, name];
};

const getPhenotypeIcon = (phenotype: string) => {
    const p = phenotype.toLowerCase();
    if (p.includes('poor') || p.includes('no function')) return { Icon: TrendingDown, color: 'text-danger', label: 'Low Clearance' };
    if (p.includes('ultrarapid') || p.includes('ultra')) return { Icon: TrendingUp, color: 'text-warning', label: 'High Clearance' };
    if (p.includes('intermediate') || p.includes('decreased')) return { Icon: Activity, color: 'text-warning', label: 'Reduced Clearance' };
    return { Icon: Minus, color: 'text-success', label: 'Normal Clearance' };
};

const getTimeWindow = (drug: string): number => {
    const halfLife = DRUG_PK_PARAMS[drug]?.halfLifeHr ?? 6;
    // Show ~5 half-lives for clearance, rounded to readable window
    const fiveHL = halfLife * 5;
    if (fiveHL < 12) return 12;
    if (fiveHL < 24) return 24;
    if (fiveHL < 72) return 72;
    return 120; // e.g. amiodarone with 40h half-life
};

const CustomTooltip = ({ active, payload, label, drug }: any) => {
    if (!active || !payload?.length) return null;
    const unit = DRUG_PK_PARAMS[drug]?.unit ?? 'mg/L';
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
            <p className="text-slate-500 font-semibold mb-1">t = {label}h</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
                    {p.name}: {parseFloat(p.value).toFixed(3)} {unit}
                </p>
            ))}
        </div>
    );
};

export default function DigitalTwin({ data }: DigitalTwinProps) {
    const [selectedDrug, setSelectedDrug] = useState(data[0]?.drug || '');
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        if (data.length > 0 && !selectedDrug) {
            setSelectedDrug(data[0].drug);
        }
    }, [data]);

    const currentData = data.find(d => d.drug === selectedDrug);

    const timeWindow = useMemo(() => getTimeWindow(selectedDrug), [selectedDrug]);

    const chartData = useMemo(() => {
        if (!currentData) return [];
        return generatePKData(currentData.drug, currentData.pharmacogenomic_profile.phenotype, timeWindow);
    }, [currentData, timeWindow]);

    const isProdrug = PRODRUG_SET.has(selectedDrug);
    const pkParams = DRUG_PK_PARAMS[selectedDrug];
    const phenotype = currentData?.pharmacogenomic_profile.phenotype ?? '';
    const { Icon: PhenoIcon, color: phenoColor, label: phenoLabel } = getPhenotypeIcon(phenotype);

    const cmax = chartData.length ? Math.max(...chartData.map(d => d.concentration)) : 0;
    const tmax = chartData.find(d => d.concentration === cmax)?.time ?? 0;

    const handleDrugChange = (drug: string) => {
        setSelectedDrug(drug);
        setAnimKey(k => k + 1); // Force re-animation
    };

    if (!currentData) return null;

    return (
        <div className="bg-white p-8 rounded-2xl relative overflow-hidden border border-slate-200 shadow-sm">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <Zap className="w-6 h-6 text-primary" />
                        Pharmacological Digital Twin
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        One-compartment PK model · Phenotype-adjusted elimination kinetics
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <select
                        className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1 md:flex-none cursor-pointer font-medium"
                        value={selectedDrug}
                        onChange={(e) => handleDrugChange(e.target.value)}
                    >
                        {data.map(d => (
                            <option key={d.drug} value={d.drug}>{d.drug}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setAnimKey(k => k + 1)}
                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors rounded-lg flex items-center justify-center shrink-0 border border-primary/20"
                        title="Re-run Simulation"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                {/* Sidebar Stats */}
                <div className="md:col-span-1 space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Target Enzyme</div>
                        <div className="text-lg font-mono font-bold text-slate-800">{currentData.pharmacogenomic_profile.primary_gene}</div>
                        <div className={`text-xs mt-1 font-semibold flex items-center gap-1 ${phenoColor}`}>
                            <PhenoIcon className="w-3 h-3" /> {phenoLabel}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Phenotype</div>
                        <div className={`text-sm font-bold ${currentData.risk_assessment.risk_label === 'Toxic' ? 'text-danger' : currentData.risk_assessment.risk_label === 'Safe' ? 'text-success' : 'text-warning'}`}>
                            {phenotype}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">PK Parameters</div>
                        <div className="space-y-1 text-xs font-mono text-slate-700">
                            <div className="flex justify-between"><span className="text-slate-400">Cmax:</span> <span>{cmax.toFixed(3)} {pkParams?.unit}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Tmax:</span> <span>{tmax.toFixed(1)}h</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">t½ (base):</span> <span>{pkParams?.halfLifeHr}h</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">Window:</span> <span>{timeWindow}h</span></div>
                            {isProdrug && <div className="text-primary text-xs pt-1 border-t border-slate-100">Prodrug — metabolite shown</div>}
                        </div>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                        <div className="text-xs text-primary uppercase tracking-wider font-bold mb-2">AI Twin Analysis</div>
                        <div className="text-xs text-slate-700 leading-relaxed">
                            {currentData.llm_generated_explanation?.twin_analysis ||
                                `This simulation models ${selectedDrug} plasma concentration over ${timeWindow}h based on your ${phenotype} phenotype. Standard dosing ${currentData.risk_assessment.risk_label === 'Toxic' ? 'may exceed the toxicity threshold.' : currentData.risk_assessment.risk_label === 'Safe' ? 'remains within the therapeutic window.' : 'may require monitoring and adjustment.'}`}
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="md:col-span-3 h-[340px] w-full bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%" key={animKey}>
                        <LineChart data={chartData} margin={{ top: 18, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="time"
                                stroke="#94a3b8"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                label={{ value: 'Time (hours)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                label={{ value: `Conc. (${pkParams?.unit ?? 'mg/L'})`, angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 11 }}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip drug={selectedDrug} />} />
                            <Legend
                                verticalAlign="top"
                                iconType="line"
                                wrapperStyle={{ fontSize: '11px', color: '#64748b', paddingBottom: '4px' }}
                            />

                            {/* Toxicity threshold */}
                            <ReferenceLine
                                y={chartData[0]?.toxicity}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                label={{ position: 'insideTopRight', value: '⚠ Toxicity Limit', fill: '#ef4444', fontSize: 10 }}
                            />
                            {/* Efficacy floor */}
                            <ReferenceLine
                                y={chartData[0]?.efficacy}
                                stroke="#10b981"
                                strokeDasharray="4 4"
                                label={{ position: 'insideBottomRight', value: '✓ Efficacy Floor', fill: '#10b981', fontSize: 10 }}
                            />
                            {/* Tmax reference */}
                            <ReferenceLine
                                x={tmax}
                                stroke="#94a3b8"
                                strokeDasharray="2 4"
                                label={{ position: 'top', value: 'Tmax', fill: '#94a3b8', fontSize: 9 }}
                            />

                            {/* Main concentration line */}
                            <Line
                                type="monotone"
                                dataKey="concentration"
                                name="Plasma Conc."
                                stroke="#0284c7"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
                                isAnimationActive={true}
                                animationDuration={1200}
                                animationEasing="ease-out"
                            />

                            {/* Active metabolite line (prodrugss only) */}
                            {isProdrug && (
                                <Line
                                    type="monotone"
                                    dataKey="metabolite"
                                    name="Active Metabolite"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="5 3"
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                                    isAnimationActive={true}
                                    animationDuration={1400}
                                    animationEasing="ease-out"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
