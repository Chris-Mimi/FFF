'use client';

import { X } from 'lucide-react';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface PlannerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlannerInfoModal({ isOpen, onClose }: PlannerInfoModalProps) {
  if (!isOpen) return null;

  return (
    <FocusTrap>
      <div
        className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className='bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col'>
          <div className='bg-[#178da6] text-white px-4 py-3 rounded-t-lg flex justify-between items-center'>
            <h3 className='text-base font-bold'>How the Planner works</h3>
            <button onClick={onClose} className='hover:bg-[#14758c] rounded p-1'>
              <X size={18} />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto p-5 text-sm text-gray-700 space-y-5'>
            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>What the Planner is for</h4>
              <p>
                Group exercises into <b>Movement Patterns</b> (e.g. &ldquo;Push-up&rdquo;,
                &ldquo;Squat&rdquo;, &ldquo;Posterior Chain&rdquo;). The Planner then watches your
                published WODs and tells you which patterns have been covered, when, and which are
                overdue. Use the grid to plan future weeks at a glance.
              </p>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Adults / Kids &amp; Teens toggle</h4>
              <p>
                Patterns are <b>shared across both tracks</b> — toggling does not change the pattern
                list. It only changes <b>which session types</b> feed the coverage and gap analysis.
                Adults excludes &ldquo;Kids &amp; Teens&rdquo; sessions; Kids excludes everything
                else.
              </p>
              <p className='mt-1'>
                In the Adults track a second <b>Session</b> toggle narrows it further: <b>All</b> (the
                full adult mix), <b>WOD</b> (WOD sessions only), or <b>Foundations</b> (Foundations +
                Foundations/WOD).
              </p>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Planning grid — past weeks</h4>
              <p className='mb-1'>Each row is a pattern, each column a week. Past-week cells:</p>
              <ul className='list-disc ml-5 space-y-0.5'>
                <li><b>Coloured dot</b> = at least one matched exercise was programmed that week</li>
                <li><b>Empty cell</b> = no coverage that week</li>
                <li>
                  <b>Click any past dot</b> to drill in — a panel below the grid shows the matched
                  exercises and the dates they were programmed.
                </li>
                <li>
                  In that panel, <b>click any exercise chip</b> to see the last 5 <i>unique</i>
                  workouts it appeared in (a workout run at several class times counts once).
                </li>
              </ul>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Planning grid — current &amp; future weeks</h4>
              <ul className='list-disc ml-5 space-y-0.5'>
                <li>
                  <b>Current week</b>: coverage shows day-by-day as it accumulates. If no exercises
                  are programmed yet, you can still mark the week as &ldquo;planned&rdquo; with the
                  open circle.
                </li>
                <li>
                  <b>Future weeks</b>: click the open circle to mark a planned week. The dot becomes
                  filled. This is your <i>intent</i> only — actual coverage replaces it once WODs
                  are programmed.
                </li>
              </ul>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Pattern staleness (warning / overdue)</h4>
              <p className='mb-1'>
                Each pattern has thresholds (settable via the gear icon). The pattern card shows a
                colour:
              </p>
              <ul className='list-disc ml-5 space-y-0.5'>
                <li><b>Green</b> — programmed within the warning threshold</li>
                <li><b>Yellow</b> — past warning threshold (default 3 weeks)</li>
                <li><b>Red</b> — past overdue threshold (default 6 weeks)</li>
                <li><b>Grey</b> — never programmed</li>
              </ul>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Inside a pattern — exercise chips</h4>
              <p className='mb-1'>
                Expand a pattern (the chevron in the <b>Movement Patterns</b> panel, or a group row
                in the grid) to see its exercises as chips. Each chip is coloured by when it was
                last programmed, across your <b>full history</b>:
              </p>
              <ul className='list-disc ml-5 space-y-0.5'>
                <li><b>Green</b> — ≤14 days</li>
                <li><b>Yellow</b> — 15–28 days</li>
                <li><b>Orange</b> — 29–60 days</li>
                <li><b>Red</b> — 61–90 days</li>
                <li><b>Light grey</b> — 90+ days</li>
                <li><b>Faded dark grey</b> — never programmed (a candidate to retire)</li>
              </ul>
              <ul className='list-disc ml-5 space-y-0.5 mt-1.5'>
                <li>
                  <b>Click a chip</b> to see the last 5 <i>unique</i> workouts it appeared in.
                </li>
                <li>
                  <b>Sort toggle</b> (top-right of the chips) — flip between <i>recent first</i> and
                  <i>stale/never first</i> to bring retire candidates to the top.
                </li>
                <li>
                  <b>Drag a chip</b> (grab the handle that appears on hover) onto another pattern&rsquo;s
                  row in the Movement Patterns panel to move it into that group.
                </li>
                <li>
                  <b>Select</b> (button by the sort toggle) — tick several chips, choose <b>Move</b>
                  {' '}(removes them here) or <b>Copy</b> (keeps them here too), then pick a target
                  group to apply it to all of them at once.
                </li>
              </ul>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Exercise picker — recency shading</h4>
              <p className='mb-1'>
                When you add exercises to a pattern, names are shaded by how recently you&rsquo;ve
                programmed them:
              </p>
              <ul className='list-disc ml-5 space-y-0.5'>
                <li><b>Teal &amp; bold</b> — already in this pattern</li>
                <li><b>Black</b> — programmed within the last 90 days</li>
                <li><b>Light grey</b> — programmed 90–180 days ago</li>
                <li><b>Faint grey + italic</b> — over 180 days ago, or never programmed</li>
              </ul>
              <p className='mt-1 text-xs text-gray-500'>
                Sorted within each category: selected first, then alphabetically.
              </p>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Auto-detection</h4>
              <p>
                Coverage is detected by scanning the <b>text content</b> of your published WOD
                sections for the names of the exercises linked to each pattern. Both exact names and
                canonical/display variants are matched. If a pattern doesn&rsquo;t light up when you
                expect it to, the most likely cause is a name mismatch between the WOD content and
                the exercise row linked to the pattern.
              </p>
            </section>

            <section>
              <h4 className='font-semibold text-gray-900 mb-1'>Uncategorised Exercises panel</h4>
              <p>
                Below the planner you&rsquo;ll see exercises that aren&rsquo;t in any pattern yet.
                Pre-Workout and Recovery &amp; Stretching are hidden by default (toggle to show
                them). Click <b>Move to…</b> on any row to drop it straight into one of your
                patterns. The list shrinks as you go — the goal is to empty it.
              </p>
            </section>

            <section className='bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-600'>
              <b className='text-gray-800'>Tip:</b> patterns can share exercises. A movement
              that fits in two patterns (e.g. a thruster in both Squat and Push) should be linked
              to both. There&rsquo;s no exclusivity rule.
            </section>
          </div>

          <div className='p-3 border-t bg-gray-50 rounded-b-lg'>
            <button
              onClick={onClose}
              className='w-full px-3 py-2 bg-[#178da6] text-white rounded text-sm font-semibold hover:bg-[#14758c] transition'
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
