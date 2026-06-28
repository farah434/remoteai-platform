import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './PremiumLock.css';

/**
 * PremiumLock — wraps a feature that requires the Pro plan.
 *
 * Usage:
 *   <PremiumLock>
 *     <MyFeatureComponent />
 *   </PremiumLock>
 *
 * If the user has plan === "pro" the children are rendered as-is.
 * Otherwise a lock overlay is shown with an upgrade prompt.
 */
export default function PremiumLock({ children, featureName = 'This feature' }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const isPro = user?.plan === 'pro';

  if (isPro) return <>{children}</>;

  return (
    <div className="premium-lock">
      <div className="premium-lock__icon">🔒</div>
      <h3 className="premium-lock__title">Premium Feature</h3>
      <p className="premium-lock__desc">
        {featureName} is available on the Pro plan. Upgrade to unlock advanced
        AI tools, unlimited CV analysis, and more.
      </p>
      <button
        className="premium-lock__btn"
        onClick={() => navigate('/pricing')}
      >
        Upgrade to Pro
      </button>
    </div>
  );
}
