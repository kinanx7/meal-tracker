import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2, RefreshCw, Type, Search, ArrowRight } from 'lucide-react';
import { analyzeMealImage, analyzeMealText } from '../services/geminiService';
import { MealAnalysis } from '../types';

interface AddMealProps {
  onSave: (analysis: MealAnalysis, imageUrl: string) => void;
  onCancel: () => void;
  initialMode?: 'camera' | 'text';
}

type InputMode = 'camera' | 'text';

const AddMeal: React.FC<AddMealProps> = ({ onSave, onCancel, initialMode = 'camera' }) => {
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        analyzeImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeMealImage(base64);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeMealText(textInput);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze text. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const reset = () => {
    setImagePreview(null);
    setAnalysis(null);
    setTextInput('');
  };

  const renderAnalysisResult = () => (
    <div className="flex-1 bg-white rounded-t-3xl relative z-10 p-6 shadow-xl overflow-y-auto w-full animate-fade-in">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        
        {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
                <p className="text-gray-600 font-medium animate-pulse">Analyzing nutritional content...</p>
            </div>
        ) : analysis ? (
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                     <div>
                        <h2 className="text-2xl font-bold text-gray-900">{analysis.mealName}</h2>
                        <p className="text-gray-500 text-sm">Confidence: {Math.round(analysis.confidenceScore * 100)}%</p>
                     </div>
                     <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold text-lg">
                        {analysis.totalCalories} kcal
                     </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                     <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs uppercase font-bold">Protein</span>
                        <span className="block text-gray-800 font-semibold">{analysis.macronutrients.protein}g</span>
                     </div>
                     <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs uppercase font-bold">Carbs</span>
                        <span className="block text-gray-800 font-semibold">{analysis.macronutrients.carbs}g</span>
                     </div>
                     <div className="bg-gray-50 p-3 rounded-xl text-center">
                        <span className="block text-gray-400 text-xs uppercase font-bold">Fat</span>
                        <span className="block text-gray-800 font-semibold">{analysis.macronutrients.fat}g</span>
                     </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Identified Items</h3>
                    <ul className="space-y-2">
                        {analysis.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-700">{item.name}</span>
                                <span className="text-gray-500">{item.calories} kcal</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    onClick={() => onSave(analysis, imagePreview || '')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center space-x-2"
                >
                    <Check size={20} />
                    <span>Save Meal to Log</span>
                </button>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <p>Could not analyze. Try again.</p>
            </div>
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 animate-fade-in relative">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20">
        <button onClick={onCancel} className="text-white p-2 bg-black/30 backdrop-blur-md rounded-full">
          <X size={24} />
        </button>
        
        {/* Toggle Mode Button */}
        {!imagePreview && !analysis && (
            <div className="bg-black/30 backdrop-blur-md p-1 rounded-full flex">
                <button 
                    onClick={() => setMode('camera')}
                    className={`p-2 rounded-full transition-all ${mode === 'camera' ? 'bg-white text-black shadow-sm' : 'text-white'}`}
                >
                    <Camera size={20} />
                </button>
                <button 
                    onClick={() => setMode('text')}
                    className={`p-2 rounded-full transition-all ${mode === 'text' ? 'bg-white text-black shadow-sm' : 'text-white'}`}
                >
                    <Type size={20} />
                </button>
            </div>
        )}

        {(imagePreview || analysis) && (
             <button onClick={reset} className="text-white p-2 bg-black/30 backdrop-blur-md rounded-full flex items-center space-x-1 px-3">
                <RefreshCw size={16} />
                <span className="text-sm">Reset</span>
             </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {mode === 'camera' ? (
             !imagePreview ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
                    <div className="text-center space-y-2 relative z-10">
                        <h2 className="text-3xl font-bold text-white">Scan your Meal</h2>
                        <p className="text-gray-400">Point your camera at your food to instantly track calories.</p>
                    </div>
                    
                    <button
                        onClick={triggerCamera}
                        className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] relative z-10"
                    >
                        <Camera size={40} className="text-white" />
                    </button>
                    
                    <label className="flex items-center space-x-2 text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors relative z-10">
                        <Upload size={20} />
                        <span className="font-medium">Or upload from gallery</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>
            ) : (
                <div className="relative w-full h-full flex flex-col">
                    <img src={imagePreview} alt="Meal Preview" className="w-full h-1/2 object-cover" />
                    <div className="-mt-6 flex-1 flex flex-col">
                         {renderAnalysisResult()}
                    </div>
                </div>
            )
        ) : (
            // Text Mode
            <div className="flex-1 flex flex-col pt-20 bg-gray-50 h-full">
                {!analysis ? (
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Meal Builder</h2>
                            <p className="text-gray-500 text-sm">Enter ingredients or search for an item to calculate calories.</p>
                        </div>
                        
                        <div className="relative mb-4">
                            <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="e.g. 2 eggs, 2 slices of toast, 1 avocado...&#10;or just 'Large Banana'"
                                className="w-full h-40 p-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-emerald-500 bg-white text-lg resize-none"
                            />
                            <div className="absolute bottom-3 right-3 text-gray-300">
                                <Type size={20} />
                            </div>
                        </div>

                        <button 
                            onClick={handleTextAnalyze}
                            disabled={!textInput.trim() || isAnalyzing}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all ${
                                !textInput.trim() 
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                            }`}
                        >
                             {isAnalyzing ? (
                                <Loader2 className="animate-spin" />
                             ) : (
                                <>
                                    <Search size={20} />
                                    <span>Calculate Calories</span>
                                </>
                             )}
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col bg-gray-900">
                        <div className="p-6 pt-2 text-white">
                             <p className="text-sm opacity-70 mb-1">You entered:</p>
                             <p className="font-medium text-lg line-clamp-2 italic">"{textInput}"</p>
                        </div>
                        {renderAnalysisResult()}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default AddMeal;