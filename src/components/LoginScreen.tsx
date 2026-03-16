import { requestLogin } from '../services/auth'

export function LoginScreen() {
  return (
    <div className="login-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#faf8f5' }}>
      <div className="login-card" style={{ textAlign: 'center', padding: '48px' }}>
        <div className="login-logo" style={{ fontSize: '48px', fontWeight: 700, color: '#e8842c', marginBottom: '16px', fontFamily: "'Trebuchet MS', sans-serif" }}>FM</div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#1e2d3d', marginBottom: '8px', fontFamily: "'Trebuchet MS', sans-serif" }}>FlowMail</h1>
        <p style={{ color: '#5a6a7a', marginBottom: '32px', fontFamily: "'Trebuchet MS', sans-serif" }}>Un client mail rapide et minimaliste.</p>
        <button
          className="btn-primary"
          onClick={requestLogin}
          style={{ background: 'linear-gradient(135deg, #e8842c 0%, #F5A623 100%)', color: 'white', fontWeight: 500, padding: '12px 32px', borderRadius: '8px', fontSize: '15px', border: 'none', cursor: 'pointer', fontFamily: "'Trebuchet MS', sans-serif", boxShadow: '0 4px 20px rgba(232, 132, 44, 0.25)' }}
        >
          Se connecter avec Google
        </button>
        <div className="login-shortcuts" style={{ marginTop: '32px' }}>
          <span className="shortcut-hint" style={{ fontSize: '12px', color: '#8a96a3', fontFamily: "'Trebuchet MS', sans-serif" }}>
            Raccourcis : <kbd>j</kbd>/<kbd>k</kbd> naviguer &middot; <kbd>o</kbd> ouvrir &middot; <kbd>e</kbd> archiver &middot; <kbd>c</kbd> composer &middot; <kbd>/</kbd> rechercher
          </span>
        </div>
      </div>
    </div>
  )
}
