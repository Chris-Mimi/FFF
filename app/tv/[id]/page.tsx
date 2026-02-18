'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatLift, formatBenchmark, formatForgeBenchmark } from '@/utils/logbook/formatters';
import type { WODFormData, WODSection } from '@/hooks/coach/useWorkoutModal';

export default function TVDisplayPage() {
  const params = useParams();
  const id = params.id as string;
  const [wod, setWod] = useState<WODFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomedSections, setZoomedSections] = useState<Set<string>>(new Set());

  const toggleZoom = (sectionId: string) => {
    setZoomedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  useEffect(() => {
    if (!id) return;

    const fetchWod = async () => {
      const { data, error: fetchError } = await supabase
        .from('wods')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !data) {
        setError('Workout not found');
        setLoading(false);
        return;
      }

      setWod({
        id: data.id,
        title: data.title || '',
        session_type: data.session_type,
        workout_name: data.workout_name,
        workout_week: data.workout_week,
        date: data.date,
        sections: data.sections || [],
        coach_notes: data.coach_notes,
        is_published: data.is_published,
        publish_sections: data.publish_sections,
        classTimes: [],
        maxCapacity: 0,
      });
      setLoading(false);
    };

    fetchWod();
  }, [id]);

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-950 flex items-center justify-center'>
        <div className='text-gray-400 text-2xl'>Loading...</div>
      </div>
    );
  }

  if (error || !wod) {
    return (
      <div className='min-h-screen bg-gray-950 flex items-center justify-center'>
        <div className='text-red-400 text-2xl'>{error || 'Workout not found'}</div>
      </div>
    );
  }

  const publishedSectionIds = new Set(wod.publish_sections || []);
  const formattedDate = wod.date
    ? new Date(wod.date + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className='min-h-screen bg-gray-950 text-white p-8 md:p-14'>
      {/* Header */}
      <header className='mb-10 border-b border-gray-700 pb-8'>
        <div className='flex items-baseline gap-6 flex-wrap'>
          <h1 className='text-6xl md:text-8xl font-black tracking-tight'>
            {wod.session_type || 'Workout'}
          </h1>
          {wod.workout_name && (
            <span className='text-5xl md:text-7xl font-bold text-[#178da6]'>
              {wod.workout_name}
            </span>
          )}
        </div>
        <p className='text-3xl md:text-4xl text-gray-400 mt-3'>{formattedDate}</p>
      </header>

      {/* Sections */}
      <div className='space-y-12'>
        {wod.sections
          .filter(
            (section: WODSection) =>
              section.content?.trim() ||
              section.lifts?.length ||
              section.benchmarks?.length ||
              section.forge_benchmarks?.length ||
              section.intent_notes?.trim()
          )
          .map((section: WODSection) => {
            const isPublished = publishedSectionIds.has(section.id);
            const zoomed = zoomedSections.has(section.id);

            // Normal vs zoomed font classes
            const headingSize = zoomed ? 'text-6xl md:text-8xl' : 'text-4xl md:text-6xl';
            const bodySize = zoomed ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl';
            const subSize = zoomed ? 'text-3xl md:text-5xl' : 'text-xl md:text-3xl';
            const intentSize = zoomed ? 'text-3xl md:text-5xl' : 'text-2xl md:text-3xl';

            return (
              <div
                key={section.id}
                className='bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800'
              >
                {/* Section Header — click to toggle zoom */}
                <div
                  className='flex items-center gap-4 mb-6 cursor-pointer group'
                  onClick={() => toggleZoom(section.id)}
                >
                  <h2 className={`${headingSize} font-bold text-[#178da6] transition-all`}>
                    {section.type}
                    {section.duration > 0 && (
                      <span className='text-gray-400 font-normal ml-3'>
                        ({section.duration} min)
                      </span>
                    )}
                  </h2>
                  <span className={`${zoomed ? 'text-base' : 'text-sm'} font-semibold text-gray-500 group-hover:text-gray-300 transition-colors select-none`}>
                    {zoomed ? '⊖' : '⊕'}
                  </span>
                  {!isPublished && (
                    <span className='text-sm font-semibold uppercase tracking-wider bg-gray-700 text-gray-400 px-3 py-1.5 rounded'>
                      Coach Only
                    </span>
                  )}
                </div>

                {/* Intent Notes */}
                {section.intent_notes?.trim() && (
                  <div className='bg-amber-950/50 border-l-4 border-amber-500 px-6 py-4 mb-8 rounded-r'>
                    <span className={`font-bold text-amber-400 ${intentSize}`}>Intent: </span>
                    <span className={`text-amber-200 ${intentSize}`}>{section.intent_notes}</span>
                  </div>
                )}

                {/* Structured Movements */}
                <div className='space-y-4'>
                  {/* Lifts */}
                  {section.lifts && section.lifts.length > 0 && (
                    <div className='space-y-3'>
                      {section.lifts.map((lift, idx) => (
                        <div
                          key={idx}
                          className={`${bodySize} bg-blue-950/50 text-blue-200 rounded-xl px-6 py-4 border border-blue-900/50 transition-all`}
                        >
                          <span className='font-bold'>{formatLift(lift)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Benchmarks */}
                  {section.benchmarks && section.benchmarks.length > 0 && (
                    <div className='space-y-3'>
                      {section.benchmarks.map((benchmark, idx) => {
                        const formatted = formatBenchmark(benchmark);
                        return (
                          <div
                            key={idx}
                            className={`${bodySize} bg-teal-950/50 text-teal-200 rounded-xl px-6 py-4 border border-teal-900/50 transition-all`}
                          >
                            <div className='font-bold'>{formatted.name}</div>
                            {formatted.description && (
                              <div className={`text-teal-300 mt-2 whitespace-pre-wrap ${subSize}`}>
                                {formatted.description}
                              </div>
                            )}
                            {!formatted.description &&
                              formatted.exercises &&
                              formatted.exercises.length > 0 && (
                                <div className={`text-teal-300 mt-2 ${subSize}`}>
                                  {formatted.exercises.join(' • ')}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Forge Benchmarks */}
                  {section.forge_benchmarks && section.forge_benchmarks.length > 0 && (
                    <div className='space-y-3'>
                      {section.forge_benchmarks.map((forge, idx) => {
                        const formatted = formatForgeBenchmark(forge);
                        return (
                          <div
                            key={idx}
                            className={`${bodySize} bg-cyan-950/50 text-cyan-200 rounded-xl px-6 py-4 border border-cyan-900/50 transition-all`}
                          >
                            <div className='font-bold'>{formatted.name}</div>
                            {formatted.description && (
                              <div className={`text-cyan-300 mt-2 whitespace-pre-wrap ${subSize}`}>
                                {formatted.description}
                              </div>
                            )}
                            {!formatted.description &&
                              formatted.exercises &&
                              formatted.exercises.length > 0 && (
                                <div className={`text-cyan-300 mt-2 ${subSize}`}>
                                  {formatted.exercises.join(' • ')}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Free-form Content */}
                  {section.content?.trim() && (
                    <div className={`${bodySize} text-gray-200 whitespace-pre-wrap leading-relaxed mt-4 transition-all`}>
                      {section.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
