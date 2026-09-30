import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { Store, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
        alert('கணக்கு உருவாக்கப்பட்டது! உள்நுழைய மின்னஞ்சலை சரிபார்க்கவும்.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'பிழை ஏற்பட்டது');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-600 text-white mb-4 shadow-lg">
            <Store className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">தமிழ் கடை உதவியாளர்</h1>
          <p className="text-lg text-gray-600 mt-2">Tamil Shop Assistant</p>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold text-center mb-6">
            {isLogin ? 'உள்நுழைய' : 'புதிய கணக்கு'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">மின்னஞ்சல்</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">கடவுச்சொல்</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="கடவுச்சொல்"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  உள்நுழைய
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  கணக்கு உருவாக்கு
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-700 font-medium text-lg"
            >
              {isLogin
                ? 'புதிய கணக்கு வேண்டுமா? பதிவு செய்யவும்'
                : 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையவும்'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
