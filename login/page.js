'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Λάθος email ή κωδικός. Δοκίμασε ξανά.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <aside className="login-aside">
        <div className="brand">
          Unisol<span>.</span>
        </div>
        <div className="aside-body">
          <h2>Οι ευκαιρίες πωλήσεων, σε ένα μέρος.</h2>
          <p>
            Παρακολούθησε leads, κατέγραψε ενέργειες και δες την πρόοδο κάθε
            υπόθεσης — από το γραφείο ή το κινητό.
          </p>
        </div>
        <div className="aside-foot">CRM · myunisol.gr</div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <h1>Καλωσήρθες</h1>
          <p className="sub">Συνδέσου για να συνεχίσεις.</p>

          <form onSubmit={handleLogin}>
            {error && <div className="error">{error}</div>}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="unisol@myunisol.gr"
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Κωδικός</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Σύνδεση…' : 'Σύνδεση'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
