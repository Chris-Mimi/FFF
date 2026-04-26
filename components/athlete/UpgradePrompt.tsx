'use client';

import { CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

interface UpgradePromptProps {
  onNavigateToPayment: () => void;
  isPastDue?: boolean;
}

export default function UpgradePrompt({ onNavigateToPayment, isPastDue }: UpgradePromptProps) {
  if (isPastDue) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Payment Failed
          </h2>

          <p className="text-gray-600 mb-6">
            Your last payment could not be processed. Please check your email for a message from Stripe and update your payment method.
          </p>

          <p className="text-sm text-gray-500 mb-6">
            Your access will be restored automatically once the payment is successful.
          </p>

          <button
            onClick={onNavigateToPayment}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            View Payment Details
          </button>
        </div>
      </div>
    );
  }

  const benefits = [
    'Track your daily workout results',
    'Log and monitor your lift PRs',
    'Record benchmark times and progress',
    'Leaderboards & achievements',
    'Access whiteboard photos',
    'See your personal records over time',
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-[#178da6]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-8 h-8 text-[#178da6]" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Unlock Your Full Athlete Experience
        </h2>

        <p className="text-gray-600 mb-6">
          Subscribe to access all features and track your fitness journey.
        </p>

        <div className="text-left mb-8">
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#178da6] flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onNavigateToPayment}
          className="w-full bg-[#178da6] hover:bg-[#14758c] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          View Subscription Options
        </button>

        <p className="text-xs text-gray-500 mt-4">
          From &euro;8/month with 1 month free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
