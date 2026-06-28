import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Pricing.css';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Get started with remote job hunting',
    features: [
      'Browse remote jobs',
      'Basic AI job matching',
      'Save up to 5 jobs',
      'Basic CV analysis',
      'Community support',
    ],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    period: 'per month',
    tagline: 'Everything you need to land your dream job',
    features: [
      'Advanced AI job matching',
      'Unlimited CV analysis',
      'Advanced skill gap analysis',
      'AI career recommendations',
      'Priority job features',
      'Premium badge on profile',
      'Unlimited saved jobs',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
];

export default function Pricing() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleUpgrade(planId) {
    if (!user) {
      navigate('/login');
      return;
    }
    if (planId === 'pro') {
      // Demo upgrade — no payment yet; structure ready for Stripe
      const updated = { ...user, plan: 'pro' };
      setUser(updated);
      localStorage.setItem('remoteai_user', JSON.stringify(updated));
    }
  }

  const currentPlan = user?.plan || 'free';

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <span className="pricing-badge">Simple Pricing</span>
        <h1 className="pricing-title">
          Invest in your <span className="pricing-gradient">career growth</span>
        </h1>
        <p className="pricing-subtitle">
          Start free. Upgrade when you&apos;re ready for AI-powered career tools.
        </p>
      </div>

      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const isActive = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`pricing-card ${plan.highlight ? 'pricing-card--pro' : ''} ${isActive ? 'pricing-card--active' : ''}`}
            >
              {plan.highlight && (
                <div className="pricing-popular-badge">Most Popular</div>
              )}

              <div className="pricing-card-header">
                <h2 className="plan-name">{plan.name}</h2>
                <div className="plan-price">
                  <span className="plan-amount">{plan.price}</span>
                  <span className="plan-period">/{plan.period}</span>
                </div>
                <p className="plan-tagline">{plan.tagline}</p>
              </div>

              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f} className="plan-feature-item">
                    <span className="feature-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`plan-cta-btn ${plan.highlight ? 'plan-cta-btn--pro' : 'plan-cta-btn--free'} ${isActive ? 'plan-cta-btn--disabled' : ''}`}
                onClick={() => handleUpgrade(plan.id)}
                disabled={isActive}
              >
                {isActive ? '✓ ' + plan.name + ' Plan Active' : plan.cta}
              </button>

              {plan.highlight && (
                <p className="plan-note">
                  🔒 Demo upgrade — payment integration coming soon
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="pricing-faq">
        <h3 className="faq-title">Frequently Asked Questions</h3>
        <div className="faq-grid">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no lock-in. Cancel anytime from your profile.' },
            { q: 'Is my data safe?', a: 'Absolutely. We never sell your data and use industry-standard encryption.' },
            { q: 'What payment methods are accepted?', a: 'Stripe integration coming soon — credit card, debit card, and PayPal.' },
            { q: 'Can I switch plans?', a: 'Yes, you can upgrade or downgrade at any time from your account settings.' },
          ].map(({ q, a }) => (
            <div key={q} className="faq-item">
              <h4 className="faq-q">{q}</h4>
              <p className="faq-a">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
