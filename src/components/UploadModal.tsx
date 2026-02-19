'use client';

import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileText, Database, FileCode2, AlertTriangle, X, Plus } from 'lucide-react';

interface UploadModalProps {
    onAnalyze: (file: File, drugs: string) => void;
    isAnalyzing: boolean;
}

const KNOWN_DRUGS = [
    'CODEINE', 'WARFARIN', 'CLOPIDOGREL', 'SIMVASTATIN', 'AZATHIOPRINE', 'FLUOROURACIL',
    'AMIODARONE', 'CITALOPRAM', 'OMEPRAZOLE', 'PHENYTOIN'
];

export default function UploadModal({ onAnalyze, isAnalyzing }: UploadModalProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedDrugs, setSelectedDrugs] = useState<string[]>(KNOWN_DRUGS);
    const [customDrugInput, setCustomDrugInput] = useState('');
    const [drugInputError, setDrugInputError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleDrug = (drug: string) => {
        setSelectedDrugs(prev => {
            if (prev.includes(drug)) {
                if (prev.length <= 1) return prev; // must keep at least 1
                return prev.filter(d => d !== drug);
            }
            return [...prev, drug];
        });
    };

    const addCustomDrug = () => {
        const name = customDrugInput.trim().toUpperCase();
        if (!name) {
            setDrugInputError('Please enter a drug name.');
            return;
        }
        if (!/^[A-Z]+$/.test(name)) {
            setDrugInputError('Drug name must contain letters only.');
            return;
        }
        if (selectedDrugs.includes(name)) {
            setDrugInputError(`${name} is already selected.`);
            return;
        }
        setDrugInputError(null);
        setSelectedDrugs(prev => [...prev, name]);
        setCustomDrugInput('');
    };

    const handleDrugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomDrug();
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (file: File) => {
        setError(null);
        setSelectedFile(null);

        if (!file.name.toLowerCase().endsWith('.vcf')) {
            setError('Invalid file type. Please upload a file with the .vcf extension.');
            return;
        }

        if (file.size === 0) {
            setError('File appears to be empty. Please upload a valid VCF file containing variant data.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setError('File is too large (>50MB). For edge processing, please upload a smaller VCF.');
            return;
        }

        // Read first 2KB to validate VCF content
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = (e.target?.result as string) || '';

            if (!text.includes('##fileformat=VCF')) {
                setError(
                    'Invalid VCF content: this file does not appear to be a valid VCF. ' +
                    'Expected a "##fileformat=VCF" header at the start of the file. ' +
                    'Please ensure you are uploading a proper Variant Call Format file.'
                );
                return;
            }

            // File is valid
            setSelectedFile(file);
        };
        reader.onerror = () => {
            setError('Could not read the uploaded file. Please try again.');
        };
        // Only read first 2KB for efficiency
        reader.readAsText(file.slice(0, 2048));
    };

    const customDrugs = selectedDrugs.filter(d => !KNOWN_DRUGS.includes(d));

    return (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative overflow-hidden transition-all">

            <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center p-4 bg-primary/10 text-primary rounded-full mb-4 shadow-sm border border-primary/20">
                    <Database className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Clinical VCF Analysis</h2>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                    Upload a raw uncompressed <span className="text-primary font-mono font-bold">.vcf</span> file to process pharmacogenomic phenotypes locally.
                    <br /><span className="text-xs mt-2 block opacity-70 border-t border-slate-200 pt-2 text-slate-400">HIPAA Compliant • Runs entirely edge-side • No data retained</span>
                </p>
            </div>

            {/* File Drop Zone */}
            <div
                className={`relative z-10 border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${dragActive
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : selectedFile ? 'border-success bg-success/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    id="vcf-upload"
                    type="file"
                    className="hidden"
                    accept=".vcf"
                    onChange={handleChange}
                />

                {selectedFile ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <FileCode2 className="w-16 h-16 text-success mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedFile.name}</h3>
                        <p className="text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for parsing</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setError(null); }}
                            className="mt-3 text-xs text-slate-400 hover:text-danger transition-colors underline"
                        >
                            Remove file
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <UploadCloud className={`w-16 h-16 mb-4 transition-colors ${dragActive ? 'text-primary' : 'text-slate-400'}`} />
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Drag & Drop VCF File</h3>
                        <p className="text-slate-500">or click to browse local files</p>
                        <p className="text-xs text-slate-400 mt-2">Must be a valid <code className="bg-slate-100 px-1 rounded">.vcf</code> file with <code className="bg-slate-100 px-1 rounded">##fileformat=VCF</code> header</p>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-3 relative z-10">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold mb-0.5">File Validation Failed</p>
                        <p className="text-danger/80">{error}</p>
                    </div>
                </div>
            )}

            {/* Drug Selection — shown after valid file is picked */}
            {selectedFile && !error && (
                <div className="mt-8 relative z-10 space-y-6">

                    {/* Drug Section */}
                    <div>
                        <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-3">Target Drugs to Analyze</h3>

                        {/* Custom Drug Input */}
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={customDrugInput}
                                    onChange={(e) => { setCustomDrugInput(e.target.value); setDrugInputError(null); }}
                                    onKeyDown={handleDrugKeyDown}
                                    placeholder="Add custom drug (e.g. METFORMIN)"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                                />
                            </div>
                            <button
                                onClick={addCustomDrug}
                                className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-semibold hover:bg-primary/20 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {/* Drug Input Error */}
                        {drugInputError && (
                            <p className="text-xs text-danger mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {drugInputError}
                            </p>
                        )}

                        {/* Known Drug Pills */}
                        <div className="flex flex-wrap gap-2">
                            {KNOWN_DRUGS.map(drug => (
                                <button
                                    key={drug}
                                    onClick={() => toggleDrug(drug)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedDrugs.includes(drug)
                                        ? 'bg-primary/20 text-primary border-primary/50'
                                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-700'
                                        }`}
                                >
                                    {drug}
                                    {selectedDrugs.includes(drug) && (
                                        <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                                    )}
                                </button>
                            ))}

                            {/* Custom added drug pills */}
                            {customDrugs.map(drug => (
                                <span
                                    key={drug}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/40 flex items-center gap-1.5"
                                >
                                    {drug}
                                    <button onClick={() => toggleDrug(drug)} className="hover:opacity-70">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {selectedDrugs.length === 0 && (
                            <p className="text-xs text-danger mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> At least one drug must be selected.
                            </p>
                        )}
                    </div>

                    {/* Analyze Button */}
                    <button
                        disabled={!selectedFile || isAnalyzing || selectedDrugs.length === 0}
                        onClick={() => selectedDrugs.length > 0 && onAnalyze(selectedFile, selectedDrugs.join(','))}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all ${!selectedFile || isAnalyzing || selectedDrugs.length === 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-primary hover:bg-primary/90 text-white shadow-md border border-primary/20'
                            }`}
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing Pharmacogenomics...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <FileText className="w-5 h-5" />
                                Analyze Genomic Profile ({selectedDrugs.length} drug{selectedDrugs.length !== 1 ? 's' : ''})
                            </span>
                        )}
                    </button>

                    {isAnalyzing && (
                        <div className="mt-4 text-center text-xs text-gray-500 animate-pulse">
                            Parsing variants → Evaluating pathways → Consulting AI
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
