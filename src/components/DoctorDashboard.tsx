'use client';

import { useState } from 'react';
import { Activity, ShieldAlert, CheckCircle, Database, Stethoscope, Award, FileWarning, ChevronDown, ChevronUp } from 'lucide-react';

interface DoctorDashboardProps {
    data: any[];
}

const getBadgeColor = (risk: string) => {
    switch (risk) {
        case 'Safe': return 'bg-success/10 text-success border-success/30';
        case 'Adjust Dosage': return 'bg-warning/10 text-warning border-warning/30';
        case 'Toxic': return 'bg-danger/10 text-danger border-danger/30';
        case 'Unknown': return 'bg-primary/10 text-primary border-primary/30';
        default: return 'bg-slate-100 text-slate-500 border-slate-300';
    }
};

function ExpandableRow({ result, idx }: { result: any; idx: number }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            {/* Main row */}
            <tr className={`border-b border-slate-100 transition-colors ${expanded ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                <td className="p-3">
                    <button
                        onClick={() => setExpanded(prev => !prev)}
                        className="flex items-center gap-2 font-semibold text-slate-900 hover:text-primary transition-colors"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${result.drug}`}
                    >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${expanded ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                        {result.drug}
                    </button>
                </td>
                <td className="p-3 text-primary font-mono">{result.pharmacogenomic_profile.primary_gene}</td>
                <td className="p-3 text-slate-600 font-mono text-xs">{result.pharmacogenomic_profile.diplotype}</td>
                <td className="p-3 text-slate-500 text-xs">{result.pharmacogenomic_profile.phenotype}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getBadgeColor(result.risk_assessment.risk_label)}`}>
                        {result.risk_assessment.risk_label.toUpperCase()}
                    </span>
                </td>
                <td className="p-3 text-slate-700 text-xs leading-relaxed min-w-[260px]">
                    {result.clinical_recommendation.action}
                    {result.clinical_recommendation.alternatives && result.clinical_recommendation.alternatives !== 'N/A' && (
                        <div className="mt-1 text-danger font-semibold">
                            Alternates: {result.clinical_recommendation.alternatives}
                        </div>
                    )}
                </td>
            </tr>

            {/* Expandable detail sub-row */}
            {expanded && (
                <tr className="bg-slate-50 border-b border-slate-200">
                    <td colSpan={6} className="px-6 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                            {/* Diplotype & Variants */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Genotype Details</h5>
                                <div className="space-y-1 text-xs">
                                    <div><span className="text-slate-400">Diplotype:</span> <span className="font-mono text-slate-800">{result.pharmacogenomic_profile.diplotype}</span></div>
                                    <div><span className="text-slate-400">Activity Score:</span> <span className="font-mono text-slate-800">{result.pharmacogenomic_profile.activity_score ?? 'N/A'}</span></div>
                                    {result.pharmacogenomic_profile.detected_variants && (
                                        <div className="mt-2">
                                            <span className="text-slate-400 block mb-1">Detected Variants:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {result.pharmacogenomic_profile.detected_variants.map((v: any, vi: number) => (
                                                    <span
                                                        key={vi}
                                                        className={`px-2 py-0.5 rounded font-mono text-xs ${v.variant_impact === 'Normal_function'
                                                            ? 'bg-success/10 text-success border border-success/20'
                                                            : v.variant_impact === 'Reduced_function' || v.variant_impact === 'No_function'
                                                                ? 'bg-danger/10 text-danger border border-danger/20'
                                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                            }`}
                                                    >
                                                        {v.rsid}: {v.genotype} ({v.variant_impact?.replace(/_/g, ' ')})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Clinician View */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                    <Stethoscope className="w-3 h-3" /> Clinical Rationale
                                </h5>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                    {result.llm_generated_explanation.clinician_view}
                                </p>
                                {result.risk_assessment.evidence_strength && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <span className="text-xs text-primary font-semibold">
                                            Evidence: {result.risk_assessment.evidence_strength}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Twin Analysis */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                    <Activity className="w-3 h-3" /> PK Twin Analysis
                                </h5>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                    {result.llm_generated_explanation.twin_analysis ?? 'Twin analysis unavailable.'}
                                </p>
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Confidence:</span>
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${Math.round(result.risk_assessment.confidence_score * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-slate-600">{Math.round(result.risk_assessment.confidence_score * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export default function DoctorDashboard({ data }: DoctorDashboardProps) {
    const gciScore = data.length > 0 ? data[0].quality_metrics.gci_score : 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6 text-sm">

            {/* Clinical Header */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl flex-1 border border-slate-200 border-l-4 border-l-accent shadow-sm flex items-start gap-4">
                    <Stethoscope className="w-8 h-8 text-accent shrink-0 mt-1" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Clinical Pharmacogenomics Summary</h2>
                        <p className="text-slate-500 leading-relaxed mb-4">
                            Diagnostic assessment based on high-throughput VCF analysis aligned with CPIC guidelines. Click any drug row to expand full clinical detail.
                        </p>
                        <div className="flex gap-4">
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600">
                                <Database className="w-3 h-3" /> Variants Assessed: {data.length > 0 ? data[0].quality_metrics.variants_analyzed : 0}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600">
                                <Award className="w-3 h-3 text-accent" /> GCI: {gciScore}/100
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table with Expandable Rows */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                            <th className="p-3">Drug ›</th>
                            <th className="p-3">Gene</th>
                            <th className="p-3">Diplotype</th>
                            <th className="p-3">Phenotype</th>
                            <th className="p-3">Risk</th>
                            <th className="p-3 min-w-[260px]">Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((result: any, idx: number) => (
                            <ExpandableRow key={idx} result={result} idx={idx} />
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-slate-400 text-center">Click any drug row (›) to reveal diplotype, detected variants, clinical rationale, and PK twin analysis.</p>
        </div>
    );
}
