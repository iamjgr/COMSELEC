/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  course: string;
  year_level: string;
  platform: string[];
  image_url?: string;
  image_position?: string;
  partylists?: { name: string, color?: string };
}

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails?: () => void;
}

export function CandidateCard({ candidate, isSelected, onSelect, onViewDetails }: CandidateCardProps) {
  const partyColor = candidate.partylists?.color || '#9B7248';

  return (
    <div
      onClick={onSelect}
      className={`card !p-0 transition-all duration-300 flex flex-col overflow-hidden relative cursor-pointer group bg-white ${
        isSelected 
          ? 'candidate-selected ring-2 ring-[var(--color-success)] shadow-xl scale-[1.02]' 
          : 'hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      {/* Selection Checkmark Overlay */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 bg-white rounded-full shadow-md animate-fade-scale">
          <CheckCircle className="w-7 h-7 text-[var(--color-success)] fill-[var(--color-success)]/10" />
        </div>
      )}

      {/* Image (Top) */}
      <div className="w-full aspect-[4/3] relative overflow-hidden bg-gray-50 shrink-0">
        {candidate.image_url ? (
          <img
            src={candidate.image_url}
            alt={candidate.full_name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ objectPosition: candidate.image_position || 'center' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-accent)] text-6xl font-bold">
            {candidate.full_name.charAt(0)}
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 items-center text-center">
        {/* Name */}
        <h3 className="font-extrabold text-gray-900 text-lg uppercase tracking-tight mb-1 break-words line-clamp-2">
          {candidate.full_name}
        </h3>
        
        {/* Course & Year */}
        <p className="text-xs sm:text-sm text-gray-500 font-medium mb-3">
          {candidate.course} <span className="mx-1 text-gray-300">•</span> Year {candidate.year_level}
        </p>

        {/* Partylist Badge */}
        <div 
          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 border"
          style={{ 
            color: partyColor,
            backgroundColor: `${partyColor}10`,
            borderColor: `${partyColor}30`
          }}
        >
          {candidate.partylists?.name || 'Independent'}
        </div>

        {/* Platform Button */}
        <div className="mt-auto pt-1 w-full pb-1">
          {candidate.platform?.length > 0 && onViewDetails && (
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                onViewDetails(); 
              }}
              className="w-32 mx-auto flex items-center justify-center py-2 rounded-xl text-white font-bold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md active:scale-95 bg-[#9B7248] hover:bg-[#7c5a38]"
            >
              Platform
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
