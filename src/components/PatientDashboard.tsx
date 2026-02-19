'use client';

import { useState } from 'react';
import { Activity, ShieldAlert, CheckCircle, Brain, Target, Shield, HeartPulse, Droplets, ChevronDown, ChevronUp } from 'lucide-react';

interface PatientDashboardProps {
    data: any[]; // API results array
}

const getRiskInfo = (risk: string) => {
    switch (risk) {
        case 'Safe': return { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', icon: CheckCircle, emoji: '🟢', metaphor: 'Smooth Highway' };
        case 'Adjust Dosage': return { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: Activity, emoji: '🟡', metaphor: 'Speed Bumps Ahead' };
        case 'Toxic': return { color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', icon: ShieldAlert, emoji: '🔴', metaphor: 'Roadblock (Bridge Out)' };
        case 'Unknown': return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', icon: Activity, emoji: '🔵', metaphor: 'Under Construction' };
        default: return { color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300', icon: Activity, emoji: '❓', metaphor: 'Unmapped Road' };
    }
};

function DrugResultCard({ result, idx }: { result: any; idx: number }) {
    const [expanded, setExpanded] = useState(false);
    const risk = result.risk_assessment.risk_label;
    const info = getRiskInfo(risk);
    const Icon = info.icon;

    return (
        <div className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md ${info.border}`}>
            {/* Card Header — always visible, clickable to toggle */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="w-full text-left p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                aria-expanded={expanded}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${info.bg} ${info.color}`}>
                        <span className="text-3xl">{info.emoji}</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-wide flex items-center gap-2 text-slate-900">
                            {result.drug}
                        </h3>
                        <div className={`text-sm font-medium mt-1 flex items-center gap-1.5 ${info.color}`}>
                            <Icon className="w-4 h-4" /> {risk.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                            Gene: {result.pharmacogenomic_profile.primary_gene} • Phenotype: {result.pharmacogenomic_profile.phenotype}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="md:text-right">
                        <span className="text-xs text-slate-400 block uppercase tracking-wider mb-1">Body&apos;s Analogy</span>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                            {info.metaphor}
                        </span>
                    </div>
                    <div className={`p-2 rounded-full transition-colors ${expanded ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>
            </button>

            {/* Expandable Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-6 pb-6 border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient LLM Explanation */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5 text-slate-900">
                            <HeartPulse className="w-24 h-24" />
                        </div>
                        <h4 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> What this means for me
                        </h4>
                        <p className="text-slate-700 leading-relaxed text-sm relative z-10">
                            {result.llm_generated_explanation.summary}
                        </p>
                    </div>

                    {/* Quick Summary Metrics */}
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1"><Droplets className="w-5 h-5 text-slate-400" /></div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase font-semibold">Associated Gene Activity</span>
                                <p className="text-slate-800 font-medium mt-0.5">{result.pharmacogenomic_profile.phenotype}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-1"><Target className="w-5 h-5 text-slate-400" /></div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase font-semibold">Action Required</span>
                                <p className="text-slate-800 font-medium mt-0.5">{result.clinical_recommendation.action}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="mt-1"><Activity className="w-5 h-5 text-slate-400" /></div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase font-semibold">Confidence Score</span>
                                <p className="text-slate-800 font-medium mt-0.5">
                                    {Math.round(result.risk_assessment.confidence_score * 100)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PatientDashboard({ data }: PatientDashboardProps) {
    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-6 rounded-2xl mb-4 border-l-4 border-l-primary shadow-sm flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Brain className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Your Personalized PGx Report</h2>
                    <p className="text-slate-500 mt-1">
                        Click any drug card below to expand its full details. {data.length} drugs analyzed.
                    </p>
                </div>
            </div>

            {data.map((result: any, idx: number) => (
                <DrugResultCard key={idx} result={result} idx={idx} />
            ))}
        </div>
    );
}
